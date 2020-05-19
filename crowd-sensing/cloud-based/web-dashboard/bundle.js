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
   * MAKE SHURE to insert the correct name for your endpoint,
   * the correct Cognito PoolID and the correct AWS region.
   */
  var AWSConfiguration = {
    poolId: 'us-east-1:5700d4bd-14c2-4c0a-bba8-954919bca682',
    host: "a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com",
    region: 'us-east-1'
  };

  //The id of the MQTT client.
  var clientId = 'CloudHARDashboard-' + (Math.floor((Math.random() * 100000) + 1));

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
      if (currentDevice != "") refreshCharts();
    }
  }

  //Function for changing the currently displayed device.
  window.changeDevice = function() {
    currentDevice = document.getElementById("device-select").value;
    if(document.getElementById('current-values-div').style.display=="block")
      updateCurrentValues();
    else refreshCharts();
    document.getElementById('refresh-charts').disabled = false;
  }




  //
  // Building the devices list and initializing current values.
  //

  //List of devices in the database.
  var devicesList = new Set();

  //Variable storing the current values of the devices.
  var devicesValues = {};

  //Variable storing the name of the station we are currently displaying.
  var currentDevice = "";

  //Parameters for the scan of the database.
  var scanParams = {
    ExpressionAttributeNames: {
      "#id": "id",
    },
    ProjectionExpression: '#id',
    TableName: 'CloudStatusHAR'
  };

  //Scans the tables CloudStatusHAR and CloudRawHAR,
  //adds the id of the devices in devicesList and in the select menu,
  //add the devices latest status to devicesValues;
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
          TableName: 'CloudStatusHAR',
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
            devicesValues[id] = {};
            devicesValues[id].status = latest.status.S;
          }
        });

        queryParams.TableName = 'CloudRawHAR';

        ddb.query(queryParams, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            var latest = data.Items[0];
            if(devicesValues[id]==undefined) devicesValues[id]={};
            devicesValues[id].raw = [];

            latest.payload.L.forEach(function(e) {
              var elem = {};
              elem.x = (e.M.x.N);
              elem.y = (e.M.y.N);
              elem.z = (e.M.z.N);
              elem.timestamp = (e.M.timestamp.N);
              devicesValues[id].raw.push(elem);
            });
            console.log(devicesValues);
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

  //The topic where the devices publish the raw data
  var rawTopic = 'CloudComputing/+';

  //The topic where the cloud publishes the result of the analysis
  var statusTopic = "CloudComputingResult";

  //Connect handler: once the MQTT client has successfully connected
  //to the MQTT server it subscribes to the topics
  function mqttClientConnectHandler() {
    console.log('connected to MQTT server');
    mqttClient.subscribe(rawTopic);
    console.log("subscribed to", rawTopic);
    mqttClient.subscribe(statusTopic);
    console.log("subscribed to", statusTopic);
  };

  //Function for updating the div containing the current status of the device.
  function updateCurrentValues() {
    var status = document.getElementById("current-status");
    status.innerHTML = devicesValues[currentDevice].status;

    var time = [];
    var x = [];
    var y = [];
    var z = [];

    devicesValues[currentDevice].raw.forEach(function(e) {
      var d = new Date();
      d.setTime(e.timestamp);
      time.push(d);
      x.push(e.x);
      y.push(e.y);
      z.push(e.z);
    });

    var currentChart = new Chart(document.getElementById('current-chart').getContext('2d'), {
      type: "line",
      data: {
        labels: time,
        datasets: [{
          label: "x",
          data: x,
          fill: false,
          borderColor: "rgb(255, 0, 0)",
        }, {
          label: "y",
          data: y,
          fill: false,
          borderColor: "rgb(0, 255, 0)",
        }, {
          label: "z",
          data: z,
          fill: false,
          borderColor: "rgb(0, 0, 255)",
        }]
      },
      "options": {
        responsive: true,
        scales: {
          xAxes: [{
            type: 'time',
            ticks: {
              source: 'data'
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

  //Message handler: upon receiving a message if it's relative to a new device
  //it adds it to the selection menu then it saves it's values in the variable
  //devicesValues and finally updates the div.
  function mqttClientMessageHandler(topic, payload) {
    console.log('message: ' + topic + ':' + payload.toString());
    var message = JSON.parse(payload.toString());

    var id;

    if (topic == statusTopic) {
      id = message.id;
      if (devicesValues[id] == undefined) {
        devicesList.push(id);
        devicesValues[id] = {};
        document.getElementById("device-select").innerHTML +=
          '<option value="' + id + '">' + id + '</option>';
      }
      devicesValues[id].status = message.status;
    } else {
      id = topic.slice(15);
      if (devicesValues[id] == undefined) {
        devicesList.push(id);
        devicesValues[id] = {};
        document.getElementById("device-select").innerHTML +=
          '<option value="' + id + '">' + id + '</option>';
      }
      devicesValues[id].raw = message;
    }

    if (currentDevice == id && document.getElementById('current-values-div').style.display == 'block') {
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

  //Function for updating the Charts displaying the data from the past hour
  window.refreshCharts = function() {
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
      TableName: 'CloudStatusHAR'
    };

    //Queries the table CloudStatusHAR retrieving the data from the
    //last hour for the selected deivce.
    ddb.query(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        var time = [];
        var dataset = [];

        data.Items.forEach(function(element) {
          var d = new Date();
          d.setTime(element.timestamp.N);
          time.push(d);
          if(element.status.S=="Moving")
            dataset.push(1);
          else dataset.push(0);
        });

        //Draws the chart.
        var chart = new Chart(document.getElementById('status-chart').getContext('2d'), {
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


    params.TableName = 'CloudRawHAR';

    //Queries the table CloudRawHAR retrieving the data from the
    //last hour for the selected deivce.
    ddb.query(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        var time = [];
        var x = [];
        var y = [];
        var z = [];

        data.Items.forEach(function(entry) {
          var d = new Date();
          d.setTime(entry.timestamp.N);
          time.push(d);
          x.push(entry.payload.L[0].M.x.N);
          y.push(entry.payload.L[0].M.y.N);
          z.push(entry.payload.L[0].M.z.N);
        });

        //Draws the chart.
        var chart = new Chart(document.getElementById('raw-chart').getContext('2d'), {
          type: "line",
          data: {
            labels: time,
            datasets: [{
              label: "x",
              data: x,
              fill: false,
              borderColor: "rgb(255, 0, 0)",
            }, {
              label: "y",
              data: y,
              fill: false,
              borderColor: "rgb(0, 255, 0)",
            }, {
              label: "z",
              data: z,
              fill: false,
              borderColor: "rgb(0, 0, 255)",
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
