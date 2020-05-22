(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
  //Loading libraries
  var AWS = require('aws-sdk');
  var AWSIoTData = require('aws-iot-device-sdk');
  var EventEmitter = require('events');



  //
  // Configuration of the AWS SDK.
  //

  /*
   * The awsConfiguration object is used to store the credentials
   * to connect to AWS service.
   * MAKE SURE to insert the correct name for your endpoint,
   * the correct Cognito PoolID and the correct AWS region.
   */
  var AWSConfiguration = {
    poolId: 'us-east-1:ec918f32-501c-4f71-baa6-733c8ca19abd',
    host: "a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com",
    region: 'us-east-1'
  };

  //The first time the website is loaded a clientId is generated and saved in
  //the cookies. On subsequent runs the id is retrieved from the cookies.
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

  clientId = 'CloudSmartphone-' + clientId;


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
  // Retrieving and publishing the sensor data.
  //

  //The frequency at which the sensors data is retrieved.
  var samplingFrequency = 4;

  //The sampler samples the accelerometer data every 'interval' milliseconds and
  //buffers it in an array of size 'windowSize'. Once the array is full it
  //emits a 'dataEvent' event and clears the buffer.
  class Sampler extends EventEmitter {
    constructor(interval, windowSize) {
      super();
      this.last = 0;
      this.interval = interval;
      this.windowSize = windowSize;
      this.buffer = [];
    }

    timeHasPast(){
      var now = Date.now();
      if (now >= this.last + this.interval){
        this.last = now;
        return true;
      }
      else return false;
    }

    add(d){
      this.buffer.push(d);
      if (this.buffer.length == this.windowSize) {
        this.emit('dataEvent', this.buffer);
        this.buffer = [];
      }
    }
  }

  var sampler = new Sampler(1000/samplingFrequency, samplingFrequency*3);


  //Connect handler: once the MQTT client has successfully connected
  //to the MQTT broker it starts publishing the data every time it receives a
  //'dataEvent' event.
  function mqttClientConnectHandler() {
    console.log('connected to MQTT server');
    sampler.on("dataEvent", function(buffer){
      mqttClient.publish('CloudComputing/'+clientId, JSON.stringify(buffer));
      console.log("publishing ");
    });
  };

  mqttClient.on('connect', mqttClientConnectHandler);


  //This function retrieves the accelerometer data from devices that support
  //the DeviceMotion API.
  function startDeviceMotionAccelerometer() {
    document.getElementById("SensorRequestBanner").style.display = "none";
    document.getElementById("id").innerHTML = clientId;
    window.addEventListener('devicemotion', function(e) {
      if(sampler.timeHasPast()){
        var d = {};
        d.x = e.accelerationIncludingGravity.x;
        d.y = e.accelerationIncludingGravity.y;
        d.z = e.accelerationIncludingGravity.z;
        d.id = clientId;
        d.timestamp = Date.now();
        sampler.add(d);
        document.getElementById("status").innerHTML = 'x: ' + d.x
                                                    + '<br> y: ' + d.y
                                                    + '<br> z: ' + d.z;
      }
    });
  }

  //This function retrieves the accelerometer data from devices that support
  //the Generic Sensor API.
  function startSensorAPIAccelerometer() {
    navigator.permissions.query({ name: 'accelerometer' })
    .then(result => {
      if (result.state === 'denied') {
        accelerometerNotAllowed();
      } else {
        document.getElementById("SensorRequestBanner").style.display = "none";
        document.getElementById("id").innerHTML = clientId;
        let sensor = new Accelerometer();
        sensor.addEventListener('reading', function(e) {
          if(sampler.timeHasPast()){
            var d = {};
            d.x = e.target.x;
            d.y = e.target.y;
            d.z = e.target.z;
            d.id = clientId;
            d.timestamp = Date.now();
            sampler.add(d);
            document.getElementById("status").innerHTML = 'x: ' + d.x
                                                        + '<br> y: ' + d.y
                                                        + '<br> z: ' + d.z;
          }
        });
        sensor.start();
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
                    + "<h3>Ops...</h3>"
                    + "<p>The app requires access to the accelerometer to work</p>"
                    + "<div>"

    document.getElementById("content").innerHTML = errorBanner;
  }

  function noAccelerometer() {
    var errorBanner = "<div id='ErrorBanner' class='Banner'>"
                    + "<h3>Ops...</h3>"
                    + "<p>Your device doesn't have an accelerometer</p>"
                    + "<div>"

    document.getElementById("content").innerHTML = errorBanner;
  }


  //On loading the page it checks what API the device supports for accessing
  //the accelerometer. If it finds one it asks for permission and if the user
  //allows the use of the sensor it starts retrieving the data.
  window.onload = function () {
    if ('Accelerometer' in window) {
      //Android
      document.getElementById("enableButton").onclick = startSensorAPIAccelerometer;
      document.getElementById("cancelButton").onclick = accelerometerNotAllowed;
      document.getElementById("SensorRequestBanner").style.display = "block";

    } else if (window.DeviceMotionEvent) {
      //iOS
      if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
        //iOS 13
        document.getElementById("enableButton").onclick = requestDeviceMotionPermission;
        document.getElementById("cancelButton").onclick = accelerometerNotAllowed;
        document.getElementById("SensorRequestBanner").style.display = "block";
      } else {
        //Older version of iOS, no need for permission
        document.getElementById("enableButton").onclick = startSensorAPIAccelerometer;
        document.getElementById("cancelButton").onclick = accelerometerNotAllowed;
        document.getElementById("SensorRequestBanner").style.display = "block";
      }
    } else {
      noAccelerometer();
    }
  }

},{"aws-iot-device-sdk":undefined,"aws-sdk":undefined,"events":undefined}]},{},[1]);
