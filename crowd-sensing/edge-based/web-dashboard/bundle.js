(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

  //Loading libraries
  var AWS = require('aws-sdk');
  var AWSIoTData = require('aws-iot-device-sdk');



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
    poolId: '<IDENTITY_POOL_ID>',
    host: '<ENDPOINT_ARN>',
    region: '<AWS_REGION>'
  };

  //The id of the MQTT client.
  var clientId = 'EdgeHARDashboard-' + (Math.floor((Math.random() * 100000) + 1));

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

  //DynamoDB service object.
  var ddb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
  });



  //
  // UI functions.
  //

  //Function for switching active tab.
  window.switchView = function(activate) {
    if (activate == "current-values-link") {
      document.getElementById("current-values-link").className = "active";
      document.getElementById("past-values-link").className = "inactive";
      document.getElementById('current-values-div').style.display = 'block';
      document.getElementById('past-values-div').style.display = 'none';
      if (currentDevice != "") updateCurrentValues();
    } else {
      document.getElementById("current-values-link").className = "inactive";
      document.getElementById("past-values-link").className = "active";
      document.getElementById('current-values-div').style.display = 'none';
      document.getElementById('past-values-div').style.display = 'block';
      if (currentDevice != "") refreshChart();
    }
  }

  //Function for changing the currently displayed device.
  window.changeDevice = function() {
    currentDevice = document.getElementById("device-select").value;
    if(document.getElementById('current-values-div').style.display=="block")
      updateCurrentValues();
    else refreshChart();
    document.getElementById('refresh-chart').disabled = false;
  }

  //
  // Building devices list and initializing current values.
  //

  //List of devices in the database.
  var devicesList = new Set();

  //Variable storing the current values of the devices.
  var devicesValues = {};

  //Variable storing the name of the device we are currently displaying.
  var currentDevice = "";

  //Parameters for the scan of the database.
  var scanParams = {
    ExpressionAttributeNames: {
      "#id": "id",
    },
    ProjectionExpression: '#id',
    TableName: 'EdgeHAR'
  };

  //Scans the table EdgeHAR,
  //adds the IDs of the devices in devicesList and in the select menu,
  //adds the devices latest status to devicesValues.
  ddb.scan(scanParams, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      data.Items.forEach(function(element) {
        devicesList.add(element.id.S);
      });
      devicesList = Array.from(devicesList);
      devicesList.sort();
      console.log("success", devicesList);

      devicesList.forEach(function(id) {
        //Parameters of the query.
        var queryParams = {
          ExpressionAttributeValues: {
            ":deivce": {
              S: id
            }
          },
          ExpressionAttributeNames: {
            "#id": "id"
          },
          KeyConditionExpression: "#id = :deivce",
          TableName: 'EdgeHAR',
          Limit: 1,
          "ScanIndexForward": false
        };

        //Queries the data from the selected device.
        ddb.query(queryParams, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            //Exploiting the fact that the data is already ordered.
            var latest = data.Items[0];
            devicesValues[id] = latest.payload.M.status.S;
            document.getElementById("device-select").innerHTML +=
              '<option value="' + id + '">' + id + '</option>';
          }
        });
      });
    }
  });




  //
  // Subscibing to MQTT topic and updating current values.
  //

  //The topic where the devices publish the sensors data.
  var deviceTopic = 'EdgeComputing/+';



  //Connect handler: once the MQTT client has successfully connected
  //to the MQTT broker it subscribes to the deviceTopic.
function mqttClientConnectHandler() {
    console.log('connected to MQTT server');
    mqttClient.subscribe(deviceTopic);
    console.log("subscribed to", deviceTopic);
  };

  //Function for updating the div containing the current status of the device.
  function updateCurrentValues() {
    var status = document.getElementById("device-status");
    status.innerHTML = devicesValues[currentDevice];
  }

  //Message handler: upon receiving a message if it's relative to a new device
  //it adds it to the selection menu then it saves its values in the variable
  //devicesValues and finally updates the div.
  function mqttClientMessageHandler(topic, payload) {
    console.log('message: ' + topic + ':' + payload.toString());
    if (devicesValues[topic.slice(14)] == undefined) {
      devicesList.push(topic.slice(14));
      document.getElementById("device-select").innerHTML +=
        '<option value="' + topic.slice(14) + '">' + topic.slice(14) + '</option>';
    }
    devicesValues[topic.slice(14)] = JSON.parse(payload.toString()).status;
    if (currentDevice != ""){
      updateCurrentValues();
    }
  };

  //Installing the connect and message handlers.
  mqttClient.on('connect', mqttClientConnectHandler);
  mqttClient.on('message', mqttClientMessageHandler);





  //
  // Past values.
  //

  //Function that returns the timestamp of one hour ago.
  function lastHour() {
    var d = new Date();
    d.setHours(d.getHours() - 1);
    return d.getTime();
  }

  //Function for updating the chart displaying the data from the past hour.
  window.refreshChart = function() {

    //Parameters of the query.
    var params = {
      ExpressionAttributeValues: {
        ":device": {
          S: currentDevice
        },
        ":lastHour": {
          N: lastHour().toString()
        }
      },
      ExpressionAttributeNames: {
        "#id": "id",
        "#time": "timestamp"
      },
      KeyConditionExpression: "#id = :device and #time >= :lastHour",
      TableName: 'EdgeHAR'
    };

    //Queries the table EdgeHAR retrieving data from the last hour
    //for the selected deivce.
    ddb.query(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("success", data);

        var time = [];
        var dataset = [];

        data.Items.forEach(function(element) {
          var d = new Date();
          d.setTime(element.timestamp.N);
          time.push(d);
          if(element.payload.M.status.S=="Moving")
            dataset.push(1);
          else dataset.push(0);
        });

        //Draws the chart.
        var chart = new Chart(document.getElementById('chart').getContext('2d'), {
          type: "line",
          data: {
            labels: time,
            datasets: [{
              label: "Status",
              data: dataset,
              fill: false,
              borderColor: "rgb(255, 0, 0)",
              steppedLine: true
            }]
          },
          "options": {
            responsive: true,
            scales: {
              xAxes: [{
                type: 'time',
                ticks: {
                  source: 'auto'
                }
              }],
              yAxes: [{
                ticks: {
                	stepSize: 1,
                  callback: function(value, index, values) {
                  	if (value==1) return "Moving";
                      else return "Resting";
                  }
                }
              }]
            },
            plugins: {
    					zoom: {
    						zoom: {
    							enabled: true,
    							drag: {
              			animationDuration: 1000
              		},
    							mode: 'x',
    							speed: 0.05
    						}
    					}
    				}
          }
        });
      }
    });

  }

},{"aws-iot-device-sdk":undefined,"aws-sdk":undefined}]},{},[1]);
