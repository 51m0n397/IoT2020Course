(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

  /*
   * The awsConfiguration object is used to store the credentials
   * to connect to AWS service.
   * MAKE SHURE to insert the correct name for your endpoint,
   * the correct Cognito PoolID and the correct AWS region.
   */
  var awsConfiguration = {
    poolId: 'us-east-1:ec918f32-501c-4f71-baa6-733c8ca19abd',
    host: "a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com",
    region: 'us-east-1'
  };
  module.exports = awsConfiguration;

}, {}], 2: [function(require, module, exports) {

  //Loading the AWS SDK and the configuration objects.
  var AWS = require('aws-sdk');
  var AWSIoTData = require('aws-iot-device-sdk');
  var AWSConfiguration = require('./aws-configuration.js');
  console.log('Loaded AWS SDK');



  //
  // Configuration of the AWS SDK.
  //

  //The id of the MQTT client.
  var clientId = 'accelerometer-' + (Math.floor((Math.random() * 100000) + 1));

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

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function publishAccelerometerData(){
    while(true){
      mqttClient.publish('accelerometer/'+clientId, JSON.stringify(accData));
      console.log("publishing " + JSON.stringify(accData));
      await sleep(1000);
    }
  }

  //Connect handler: once the MQTT client has successfully connected
  //to the MQTT server it starts publishing
  window.mqttClientConnectHandler = function() {
    console.log('connected to MQTT server');
    publishAccelerometerData();
  };

  function createMedianFilter(length) {
    var buffer   = new Float64Array(length)
    var history  = new Int32Array(length)
    var counter  = 0
    var bufCount = 0
    function insertItem(x) {
      var nextCounter = counter++
      var oldCounter  = nextCounter - length

      //First pass:  Remove all old items
      var ptr = 0
      for(var i=0; i<bufCount; ++i) {
        var c = history[i]
        if(c <= oldCounter) {
          continue
        }
        buffer[ptr] = buffer[i]
        history[ptr] = c
        ptr += 1
      }
      bufCount = ptr

      //Second pass:  Insert x
      if(!isNaN(x)) {
        var ptr = bufCount
        for(var j=bufCount-1; j>=0; --j) {
          var y = buffer[j]
          if(y < x) {
            buffer[ptr] = x
            history[ptr] = nextCounter
            break
          }
          buffer[ptr] = y
          history[ptr] = history[j]
          ptr -= 1
        }
        if(j < 0) {
          buffer[0]  = x
          history[0] = nextCounter
        }
        bufCount += 1
      }

      //Return median
      if(!bufCount) {
        return NaN
      } else if(bufCount & 1) {
        return buffer[bufCount>>>1]
      } else {
        var mid = bufCount>>>1
        return 0.5*(buffer[mid-1] + buffer[mid])
      }
    }
    return insertItem
  }
  function createLowPassFilter(cutoff, sampleRate) {
    var rc = 1.0 / (cutoff * 2 * Math.PI);
    var dt = 1.0 / sampleRate;
    var alpha = dt / (rc + dt);

    var previous;

    function insertItem(x){
      if (previous==undefined){
        previous = x;
        return x;
      } else {
        var next = previous + (alpha * (x - previous));
        previous = next;
        return next;
      }
    }

    return insertItem;
  }
  function createHighPassFilter(cutoff, sampleRate) {
    var rc = 1.0 / (cutoff * 2 * Math.PI);
    var dt = 1.0 / sampleRate;
    var alpha = rc / (rc + dt);

    var previousFiltered;
    var previousSample;

    function insertItem(x){
      if (previousFiltered == undefined){
        previousFiltered = x;
        previousSample = x;
        return x;
      } else {
        var next = alpha * (previousFiltered + x -previousSample);
        previousFiltered = next;
        previousSample = x;
        return next;
      }
    }

    return insertItem;
  }
  function windowAnalysis(windowSize){
    var buffer = [];
    var status = "Resting";

    function insertItem(x){
      buffer.push(x);
      if(buffer.length==windowSize){

        var average=0;
        for(var i=0; i<buffer.length; i++){
          average+=buffer[i];
        }

        average = average/buffer.length;

        console.log(average);

        if (average>0.2) status = "Moving";
        else status = "Resting";

        buffer.splice(0, windowSize/2);
      }
      return status;
    }

    return insertItem;
  }

  var medianX = createMedianFilter(120);
  var lowPassX = createLowPassFilter(20, 60);
  var highPassX = createHighPassFilter(0.3, 60);

  var medianY = createMedianFilter(120);
  var lowPassY = createLowPassFilter(20, 60);
  var highPassY = createHighPassFilter(0.3, 60);

  var medianZ = createMedianFilter(120);
  var lowPassZ = createLowPassFilter(20, 60);
  var highPassZ = createHighPassFilter(0.3, 60);

  var getMovement = windowAnalysis(120);



  function listener(x, y, z){
    let status = document.getElementById('status');
    status.innerHTML = 'x: ' + x + '<br> y: ' + y + '<br> z: ' + z;

    var filteredX = medianX(lowPassX(highPassX(x)));
    var filteredY = medianY(lowPassY(highPassY(y)));
    var filteredZ = medianZ(lowPassZ(highPassZ(z)));

    let filteredStatus = document.getElementById('filtered-status');
    filteredStatus.innerHTML = 'x: ' + filteredX + '<br> y: ' + filteredY + '<br> z: ' + filteredZ;

    document.getElementById('movement').innerHTML = getMovement(Math.abs(filteredX)+Math.abs(filteredY)+Math.abs(filteredZ));
  }


  function sensorAPIAccelerometer() {
    let status = document.getElementById('status');
    let sensor = new Accelerometer({frequency: 60});

    sensor.addEventListener('reading', function(e) {
      listener(e.target.x, e.target.y, e.target.z);
    });
    sensor.start();
  }

  function deviceMotionAccelerometer() {
    window.addEventListener('devicemotion', function(e) {
      listener(e.accelerationIncludingGravity.x,
               e.accelerationIncludingGravity.y,
               e.accelerationIncludingGravity.z);
    });
  }

  function requestDeviceMotionPermission() {
    window.DeviceMotionEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          console.log('DeviceMotion permissions granted.')
          deviceMotionAccelerometer();
        } else {
          console.log('DeviceMotion permissions not granted.')
        }
      })
      .catch(e => {
        console.error(e)
      })
  }

  window.onerror = function(message, source, lineno, colno, error) {
    alert(message);
  }

  window.onload = function () {
    if ('Accelerometer' in window) {
      //android
      sensorAPIAccelerometer();
    } else if (window.DeviceMotionEvent) {
      //ios
      if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
        //ios 13
        var button = document.getElementById("permission");
        button.onclick = requestDeviceMotionPermission;
        button.style.display = "block";
      } else {
        //older version of ios, no need for permission
        deviceMotionAccelerometer();
      }
    } else document.getElementById('status').innerHTML = 'Accelerometer not supported';
  }

},{"./aws-configuration.js":1,"aws-iot-device-sdk":"aws-iot-device-sdk","aws-sdk":"aws-sdk"}]},{},[2]);
