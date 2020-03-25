The folder **environmental_station** contains a python script that simulates multiple IoT devices.
The devices are environmental stations capable of measuring temperature, humidity, wind direction, wind intensity and rain height.

The values of the sensors are published on an MQTT channel. The MQTT is managed using AWS IoT.

The folder **web_client** contains a website that provides a dashboard capable of displaying the current values of the sensors and the values received during the last hour.

The dashboard is accessible at the link https://51m0n397.github.io/IoTAssignment1/web_client/

For further information check this post https://www.hackster.io/simone-bartolini/iot-virtual-environmental-station-using-aws-c01649
