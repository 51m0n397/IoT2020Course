(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

/*
 * NOTE: You must set the following string constants prior to running this
 * example application.
 */
var awsConfiguration = {
   poolId: 'us-east-1:5ae4946b-fba9-42a3-b03a-8cf97ce235f0', // 'YourCognitoIdentityPoolId'
   host: "a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com", // 'YourAwsIoTEndpoint', e.g. 'prefix.iot.us-east-1.amazonaws.com'
   region: 'us-east-1' // 'YourAwsRegion', e.g. 'us-east-1'
};
module.exports = awsConfiguration;


},{}],2:[function(require,module,exports){

//
// Instantiate the AWS SDK and configuration objects.  The AWS SDK for
// JavaScript (aws-sdk) is used for Cognito Identity/Authentication, and
// the AWS IoT SDK for JavaScript (aws-iot-device-sdk) is used for the
// WebSocket connection to AWS IoT and device shadow APIs.
//
var AWS = require('aws-sdk');
var AWSIoTData = require('aws-iot-device-sdk');
var AWSConfiguration = require('./aws-configuration.js');

console.log('Loaded AWS SDK for JavaScript and AWS IoT SDK for Node.js');

//
// Remember our current subscription topic here.
//
var currentlySubscribedTopic = 'stations/+';

var stationsStatus = {};
var currentStation = "";

//
// Create a client id to use when connecting to AWS IoT.
//
var clientId = 'dashboard-' + (Math.floor((Math.random() * 100000) + 1));

//
// Initialize our configuration.
//
AWS.config.region = AWSConfiguration.region;

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
   IdentityPoolId: AWSConfiguration.poolId
});

//
// Create the AWS IoT device object.  Note that the credentials must be
// initialized with empty strings; when we successfully authenticate to
// the Cognito Identity Pool, the credentials will be dynamically updated.
//
const mqttClient = AWSIoTData.device({
   //
   // Set the AWS region we will operate in.
   //
   region: AWS.config.region,
   //
   ////Set the AWS IoT Host Endpoint
   host:AWSConfiguration.host,
   //
   // Use the clientId created earlier.
   //
   clientId: clientId,
   //
   // Connect via secure WebSocket
   //
   protocol: 'wss',
   //
   // Set the maximum reconnect time to 8 seconds; this is a browser application
   // so we don't want to leave the user waiting too long for reconnection after
   // re-connecting to the network/re-opening their laptop/etc...
   //
   maximumReconnectTimeMs: 8000,
   //
   // Enable console debugging information (optional)
   //
   debug: true,
   //
   // IMPORTANT: the AWS access key ID, secret key, and sesion token must be
   // initialized with empty strings.
   //
   accessKeyId: '',
   secretKey: '',
   sessionToken: ''
});

//
// Attempt to authenticate to the Cognito Identity Pool.  Note that this
// example only supports use of a pool which allows unauthenticated
// identities.
//
var cognitoIdentity = new AWS.CognitoIdentity();
AWS.config.credentials.get(function(err, data) {
   if (!err) {
      console.log('retrieved identity: ' + AWS.config.credentials.identityId);
      var params = {
         IdentityId: AWS.config.credentials.identityId
      };
      cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
         if (!err) {
            //
            // Update our latest AWS credentials; the MQTT client will use these
            // during its next reconnect attempt.
            //
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
// Connect handler; update div visibility and fetch latest shadow documents.
// Subscribe to lifecycle events on the first connect event.
//
window.mqttClientConnectHandler = function() {
   console.log('connect');
   mqttClient.subscribe(currentlySubscribedTopic);
};


//
// Utility function to determine if a value has been defined.
//
window.isUndefined = function(value) {
   return typeof value === 'undefined' || typeof value === null;
};

//
// Message handler for lifecycle events; create/destroy divs as clients
// connect/disconnect.
//
window.mqttClientMessageHandler = function(topic, payload) {
   console.log('message: ' + topic + ':' + payload.toString());
   var stationNum = Object.keys(stationsStatus).length;
   stationsStatus[topic.slice(9)]=JSON.parse(payload.toString());
   console.log(stationsStatus);
   if (Object.keys(stationsStatus).length!= stationNum) {
     document.getElementById("station-select").innerHTML += '<option value="'+ topic.slice(9) + '">' + topic.slice(9) + '</option>';
   }
   if (currentStation!="") updateInfo();
};

window.updateInfo = function() {
   var infoTable = document.getElementById("station-info");
   infoTable.rows.item(0).cells.item(1).innerHTML = stationsStatus[currentStation].temperature + " °C";
   infoTable.rows.item(1).cells.item(1).innerHTML = stationsStatus[currentStation].humidity + "%";
   infoTable.rows.item(2).cells.item(1).innerHTML = stationsStatus[currentStation].windDirection  + "°";
   infoTable.rows.item(3).cells.item(1).innerHTML = stationsStatus[currentStation].windIntensity + " m/s";
   infoTable.rows.item(4).cells.item(1).innerHTML = stationsStatus[currentStation].rainHeight + " mm/h";
}

window.changeStation = function() {
   currentStation = document.getElementById("station-select").value;
   updateInfo();
}

window.switchView = function(activate) {
  if (activate=="current-status-link"){
    document.getElementById("current-status-link").className = "active";
    document.getElementById("past-status-link").className = "inactive";
    document.getElementById('current-status-div').style.display = 'block';
    document.getElementById('past-status-div').style.display = 'none';
  } else {
    document.getElementById("current-status-link").className = "inactive";
    document.getElementById("past-status-link").className = "active";
    document.getElementById('current-status-div').style.display = 'none';
    document.getElementById('past-status-div').style.display = 'block';
  }
}

//
// Install connect/reconnect event handlers.
//
mqttClient.on('connect', window.mqttClientConnectHandler);
mqttClient.on('message', window.mqttClientMessageHandler);


// Create DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
var stationsList = new Set();

var scanParams = {
  ExpressionAttributeNames:{
      "#id": "id",
  },
  ProjectionExpression: '#id',
  TableName: 'EnvironmentalStations'
};

ddb.scan(scanParams, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    data.Items.forEach(function(element, index, array) {
      stationsList.add(element.id.S);
    });
    stationsList = Array.from(stationsList);
    console.log("Success", stationsList);
    stationsList.forEach(function(element, index, array) {
      document.getElementById("station-history-select").innerHTML += '<option value="'+ element + '">' + element + '</option>';
    });
  }
});

function lastHour() {
  var d = new Date();
  d.setHours(d.getHours() -1);
  return d.getTime();
}

function dateToHMS(d) {
  function addZero(i) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
  }
  var h = addZero(d.getHours());
  var m = addZero(d.getMinutes());
  var s = addZero(d.getSeconds());
  return h + ":" + m + ":" + s;
}

window.changeHistoryStation = function() {
  var params = {
    ExpressionAttributeValues: {
        ":station":{S:document.getElementById("station-history-select").value},
        ":lastHour":{N:lastHour().toString()}
    },
    ExpressionAttributeNames:{
        "#id": "id",
        "#time": "timestamp"
    },
    KeyConditionExpression: "#id = :station and #time >= :lastHour",
    //ProjectionExpression: 'payload',
    TableName: 'EnvironmentalStations'
  };

  ddb.query(params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      var time = [];
      var temp = [];
      var hum = [];
      var windDir = [];
      var windInt = [];
      var rain = [];
      data.Items.forEach(function(element, index, array) {
        var d = new Date();
        d.setTime(element.timestamp.N);
        time.push(dateToHMS(d));
        temp.push(element.payload.M.temperature.S);
        hum.push(element.payload.M.humidity.S);
        windDir.push(element.payload.M.windDirection.S);
        windInt.push(element.payload.M.windIntensity.S);
        rain.push(element.payload.M.rainHeight.S);
      });

      var temChart = new Chart(document.getElementById('temp-chart').getContext('2d'), {
        "type": "line",
        "data": {
          "labels": time,
          "datasets": [{
            "label": "Temperature",
            "data": temp,
            "fill": false,
            "borderColor": "rgb(241,88,84)",
            "lineTension": 0.1
          }]
        },
        "options": {
          responsive: true
        }
      });

      var humChart = new Chart(document.getElementById('hum-chart').getContext('2d'), {
        "type": "line",
        "data": {
          "labels": time,
          "datasets": [{
            "label": "Humidity",
            "data": hum,
            "fill": false,
            "borderColor": "rgb(250,164,58)",
            "lineTension": 0.1
          }]
        },
        "options": {
          responsive: true
        }
      });

      var windDirChart = new Chart(document.getElementById('wind-dir-chart').getContext('2d'), {
        "type": "line",
        "data": {
          "labels": time,
          "datasets": [{
            "label": "Wind Direction",
            "data": windDir,
            "fill": false,
            "borderColor": "rgb(96,189,104)",
            "lineTension": 0.1
          }]
        },
        "options": {
          responsive: true
        }
      });

      var windIntChart = new Chart(document.getElementById('wind-int-chart').getContext('2d'), {
        "type": "line",
        "data": {
          "labels": time,
          "datasets": [{
            "label": "Wind Intensity",
            "data": windInt,
            "fill": false,
            "borderColor": "rgb(93,165,218)",
            "lineTension": 0.1
          }]
        },
        "options": {
          responsive: true
        }
      });

      var rainChart = new Chart(document.getElementById('rain-chart').getContext('2d'), {
        "type": "line",
        "data": {
          "labels": time,
          "datasets": [{
            "label": "Rain Height",
            "data": rain,
            "fill": false,
            "borderColor": "rgb(178,118,178)",
            "lineTension": 0.1
          }]
        },
        "options": {
          responsive: true
        }
      });
    }
  });
}



},{"./aws-configuration.js":1,"aws-iot-device-sdk":"aws-iot-device-sdk","aws-sdk":"aws-sdk"}]},{},[2]);
