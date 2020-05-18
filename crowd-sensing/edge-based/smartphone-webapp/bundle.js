(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
  //Loading libraries
  var AWS = require('aws-sdk');
  var AWSIoTData = require('aws-iot-device-sdk');
  var EventEmitter = require('events');
  var createMedianFilter = require('moving-median');



  //
  // Configuration of the AWS SDK.
  //

  /*
   * The awsConfiguration object is used to store the credentials
   * to connect to AWS service.
   * MAKE SHURE to insert the correct name for your endpoint,
   * the correct Cognito PoolID and the correct AWS region.
   */
  var AWSConfiguration = {
    poolId: 'us-east-1:b77e9685-4a3c-4306-a929-e440fb47df86',
    host: "a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com",
    region: 'us-east-1'
  };

  //The first time the website is loaded a clientId is generated and saved in
  //the cookies. On subsequent runs the id is retrieved from the cookies
  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  var clientId = getCookie("clientId");
  if (clientId == "") {
    clientId = (Math.floor((Math.random() * 100000) + 1));
    document.cookie = "clientId="+clientId;
  }

  clientId = 'EdgeSmartphone-' + clientId;


  AWS.config.region = AWSConfiguration.region;
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: AWSConfiguration.poolId
  });

  //The mqttClient object used for retrieving the messages from the MQTT server.
  const mqttClient = AWSIoTData.device({
    region: AWS.config.region, //Set the AWS region we will operate in
    host: AWSConfiguration.host, //Set the AWS IoT Host Endpoint
    clientId: clientId, //The clientId created earlier
    protocol: 'wss', //Connect via secure WebSocket
    maximumReconnectTimeMs: 8000, //Set the maximum reconnect time to 8 seconds
    debug: true, //Enable console debugging information
    accessKeyId: '',
    secretKey: '',
    sessionToken: ''
  });


  //The cognitoIdentity used for authentication.
  var cognitoIdentity = new AWS.CognitoIdentity();
  AWS.config.credentials.get(function(err, data) {
    if (!err) {
      console.log('retrieved identity: ' + AWS.config.credentials.identityId);
      var params = {
        IdentityId: AWS.config.credentials.identityId
      };
      cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
        if (!err) {
          mqttClient.updateWebSocketCredentials(data.Credentials.AccessKeyId,
            data.Credentials.SecretKey,
            data.Credentials.SessionToken);
        } else {
          console.log('error retrieving credentials: ' + err);
          alert('error retrieving credentials: ' + err);
        }
      });
    } else {
      console.log('error retrieving identity:' + err);
      alert('error retrieving identity: ' + err);
    }
  });





  //
  // retrieving sensors data
  //

  var accData = {x:0, y:0, z:0};

  //The frequency at which the sensors data is retrieved
  var samplingFrequency = 4;


  //This function creates a median filter with a window of size length
  function createCombinedMedianFilter(length){
    var medianX = createMedianFilter(length);
    var medianY = createMedianFilter(length);
    var medianZ = createMedianFilter(length);

    function insertData(d){
      var x = medianX(d.x);
      var y = medianX(d.y);
      var z = medianX(d.z);

      return {x:x, y:y, z:z};
    }

    return insertData;
  }

  //This function creates a low pass filter where 'cutoff' is the cutoff
  //frequency and 'sampleRate' is the sampling rate
  function createLowPassFilter(cutoff, sampleRate) {
    var rc = 1.0 / (cutoff * 2 * Math.PI);
    var dt = 1.0 / sampleRate;
    var alpha = dt / (rc + dt);

    var previous;

    function filterItem(d){
      if (previous == undefined){
        previous = d;
        return d;
      } else {
        var next = {
          x: previous.x + (alpha * (d.x - previous.x)),
          y: previous.y + (alpha * (d.y - previous.y)),
          z: previous.z + (alpha * (d.z - previous.z))
        }
        previous = next;
        return next;
      }
    }

    return filterItem;
  }

  //This function creates a high pass filter where 'cutoff' is the cutoff
  //frequency and 'sampleRate' is the sampling rate
  function createHighPassFilter(cutoff, sampleRate) {
    var rc = 1.0 / (cutoff * 2 * Math.PI);
    var dt = 1.0 / sampleRate;
    var alpha = rc / (rc + dt);

    var previousFiltered;
    var previousSample;

    function insertItem(d){
      if (previousFiltered == undefined){
        previousFiltered = d;
        previousSample = d;
        return d;
      } else {
        var next = {
          x: alpha * (previousFiltered.x + d.x -previousSample.x),
          y: alpha * (previousFiltered.y + d.y -previousSample.y),
          z: alpha * (previousFiltered.z + d.z -previousSample.z)
        }

        previousFiltered = next;
        previousSample = d;
        return next;
      }
    }

    return insertItem;
  }

  //The SlidingWindowAnalyzer analyzes the filtered data and checks if the
  //person is moving or standing still. If the status changes it fires a
  //'statusChanged' event
  class SlidingWindowAnalyzer extends EventEmitter {
    constructor(windowSize) {
      super();
      this.windowSize = windowSize;
      this.window = [];
      this.status = "Resting";
    }

    insertItem(d){
      this.window.push(d);
      if(this.window.length == this.windowSize){
        var average = 0;
        for(var i=0; i<this.window.length; i++){
          average += Math.abs(this.window[i].x)
                   + Math.abs(this.window[i].y)
                   + Math.abs(this.window[i].z);
        }

        average = average/(this.windowSize);

        console.log(average);

        if (average > 0.8 && this.status == "Resting"){
          this.status = "Moving";
          this.emit('statusChanged');
        } else if (average <= 0.8 && this.status == "Moving") {
          this.status = "Resting";
          this.emit('statusChanged');
        }

        this.window.splice(0, this.windowSize/2);
      }
      return this.status;
    }
  }

  var medianFilter = createCombinedMedianFilter(samplingFrequency);
  var lowPassFilter = createLowPassFilter(20, samplingFrequency);
  var highPassFilter = createHighPassFilter(0.3, samplingFrequency);
  var slidingWindowAnalyzer = new SlidingWindowAnalyzer(samplingFrequency*3);


  //It filters the raw acceleromiter data and pass it to the SlidingWindowAnalyzer
  function analyzeData() {
    var filteredData = highPassFilter(lowPassFilter(medianFilter(accData)));
    slidingWindowAnalyzer.insertItem(filteredData);
  }

  //Connect handler: once the MQTT client has successfully connected
  //to the MQTT server it starts publishing the data every time is receives a
  //'statusChanged' event
  function mqttClientConnectHandler() {
    console.log('connected to MQTT server');
    slidingWindowAnalyzer.on("statusChanged", function(){
      mqttClient.publish('EdgeComputing/'+clientId, JSON.stringify({status:this.status}));
      console.log("publishing " + JSON.stringify({status:this.status}));
    });
  };

  mqttClient.on('connect', mqttClientConnectHandler);

  //This function retreives the accelerometer data from devices that support
  //the DeviceMotion API
  function startDeviceMotionAccelerometer() {
    document.getElementById("SensorRequestBanner").style.display = "none";
    window.addEventListener('devicemotion', function(e) {
      accData.x = e.accelerationIncludingGravity.x;
      accData.y = e.accelerationIncludingGravity.y;
      accData.z = e.accelerationIncludingGravity.z;
    });

    setInterval(analyzeData, 1000/samplingFrequency);
    slidingWindowAnalyzer.on("statusChanged", function(){
      document.getElementById('status').innerHTML = this.status;
    });
  }

  //This function retreives the accelerometer data from devices that support
  //the Sensor API
  function startSensorAPIAccelerometer() {
    navigator.permissions.query({ name: 'accelerometer' })
    .then(result => {
      if (result.state === 'denied') {
        accelerometerNotAllowed();
      } else {
        document.getElementById("SensorRequestBanner").style.display = "none";
        let sensor = new Accelerometer();
        sensor.addEventListener('reading', function(e) {
          accData.x = e.target.x;
          accData.y = e.target.y;
          accData.z = e.target.z;
        });
        sensor.start();

        setInterval(analyzeData, 1000/samplingFrequency);
        slidingWindowAnalyzer.on("statusChanged", function(){
          document.getElementById('status').innerHTML = this.status;
        });
      }
    });
  }

  function requestDeviceMotionPermission() {
    window.DeviceMotionEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          startDeviceMotionAccelerometer();
        } else {
          accelerometerNotAllowed();
        }
      })
      .catch(e => {
        console.error(e);
        accelerometerNotAllowed();
      })
  }

  function accelerometerNotAllowed() {
    var errorBanner = "<div id='ErrorBanner' class='Banner'>"
                    + "<h3>Ops..</h3>"
                    + "<p>The app requires access to the accelerometer to work</p>"
                    + "<div>"

    document.getElementById("content").innerHTML = errorBanner;
  }

  function noAccelerometer() {
    var errorBanner = "<div id='ErrorBanner' class='Banner'>"
                    + "<h3>Ops..</h3>"
                    + "<p>Your device doesn't have an accelerometer</p>"
                    + "<div>"

    document.getElementById("content").innerHTML = errorBanner;
  }

  //On loading the page it checks what API the device supports for accessing
  //the acceleromiter. If it finds one it asks for permission and if the user
  //allows the use of the sensor it starts retrieving the data
  window.onload = function() {
    if ('Accelerometer' in window) {
      //android
      document.getElementById("enableButton").onclick = startSensorAPIAccelerometer;
      document.getElementById("cancelButton").onclick = accelerometerNotAllowed;
      document.getElementById("SensorRequestBanner").style.display = "block";

    } else if (window.DeviceMotionEvent) {
      //ios
      if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
        //ios 13
        document.getElementById("enableButton").onclick = requestDeviceMotionPermission;
        document.getElementById("cancelButton").onclick = accelerometerNotAllowed;
        document.getElementById("SensorRequestBanner").style.display = "block";
      } else {
        //older version of ios, no need for permission
        document.getElementById("enableButton").onclick = startSensorAPIAccelerometer;
        document.getElementById("cancelButton").onclick = accelerometerNotAllowed;
        document.getElementById("SensorRequestBanner").style.display = "block";
      }
    } else {
      noAccelerometer();
    }
  }

},{"aws-iot-device-sdk":undefined,"aws-sdk":undefined,"events":undefined,"moving-median":undefined}]},{},[1]);
