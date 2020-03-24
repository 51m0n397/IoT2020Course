The folder **things** contains a python script that simulates multiple IoT devices.
The devices are environmental stations capable of measuring temperature, humidity, wind direction, wind intensity and rain height.

The values of the sensors are published on an MQTT channel. The MQTT is managed using AWS IoT.

The folder **web_client** contains a website that provides a dashboard capable of displaying the current status of the sensors and the values received during the last hour.

The dashboard is accessible at the link https://51m0n397.github.io/IoTAssignment1/
