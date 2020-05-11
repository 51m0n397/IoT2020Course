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

  var accData = {x:0, y:0, z:0};

  function updateAccView() {
    let status = document.getElementById('status');
    status.innerHTML = 'x: ' + accData.x + '<br> y: ' + accData.y + '<br> z: ' + accData.z;
  }

  function sensorAPIAccelerometer() {
    let status = document.getElementById('status');
    let sensor = new Accelerometer();
    sensor.addEventListener('reading', function(e) {
      accData.x = e.target.x;
      accData.y= e.target.y;
      accData.z = e.target.z;
      updateAccView();
    });
    sensor.start();
  }

  function deviceMotionAccelerometer() {
    window.addEventListener('devicemotion', function(e) {
      accData.x = e.accelerationIncludingGravity.x;
      accData.y= e.accelerationIncludingGravity.y;
      accData.z = e.accelerationIncludingGravity.z;
      updateAccView();
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



  //Installing the connect handler.
  mqttClient.on('connect', window.mqttClientConnectHandler);


},{"./aws-configuration.js":1,"aws-iot-device-sdk":"aws-iot-device-sdk","aws-sdk":"aws-sdk"}]},{},[2]);
