# IoT environmental station

This is an example of an IoT environmental station capable of measuring temperature, humidity, wind direction, wind intensity and rain height.
It has been developed as part of the IoT course during my Engineering in Computer Science master's degree at Sapienza - University of Rome.



## Part 1: Python virtual environmental station
In this first part the environmental stations are simulated using a python script.

### Architecture
![](/images/architecture1.png)
- The virtual environmental stations publish on an MQTT channel the data from the sensors. The code for this is in the folder **environmental_station**;

- AWS is used to manage the MQTT broker. The messages received are also saved in a DynamoDB database;

- A web-based dashboard developed in javascript displays the current state of the sensors and the values received during the last hour. The code for this is in the folder **web_client**.

### How to run
For information about how to run this part of the project check my blogpost on Hackster https://www.hackster.io/simone-bartolini/iot-environmental-station-using-aws-part-1-c01649

### Demonstration
You can see this part of the project in action in this video https://www.youtube.com/watch?v=9jjE9SlO0yw



## Part 2: RiotOS environmental station
In this second part the python script is replaced by a program for RiotOS, an operating system for embedded devices, running on the emulated "native" board.

### Architecture
![](/images/architecture2.png)
- The IoT devices publish the sensor data on a topic using MQTT-SN. The code for this in in the folder **riot_environmental_station**;

- Eclipse mosquito RSMB is used as a MQTT-SN broker. The code for this in in the folder **MQTTSN-broker**;

- A python script act as an MQTT-SN to MQTT bridge subscribing to the topics on the MQTT-SN broker and republishing the messages on the same topics but over the AWS IoT MQTT broker. The code for this in in the folder **MQTTSN-bridge**;

- As in the first part of the project AWS saves the messages received into a DynamoDB table;

- The same web dashboard as before is used to display the data.

### How to run
For information about how to run this part of the project check my blogpost on Hackster https://www.hackster.io/simone-bartolini/iot-environmental-station-using-aws-part-2-1da6cc

### Demonstration
You can see this part of the project in action in this video https://youtu.be/aDZ3S6hlsIA



**Author**: Simone Bartolini https://www.linkedin.com/in/simone-bartolini-9628561a3
