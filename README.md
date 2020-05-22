# IoT 2020 course
This repository contains the code for the assignments of the IoT 2020 course from the Engineering in Computer Science master's degree at Sapienza - University of Rome.

**Author**: Simone Bartolini https://www.linkedin.com/in/simone-bartolini-9628561a3

## Assignments 1-3: IoT environmental station

This is an example of an IoT environmental station capable of measuring temperature, humidity, wind direction, wind intensity and rain height.



### Part 1: Python virtual environmental station
In this first part the environmental stations are simulated using a python script.

#### Architecture
![](/images/architecture1.png)
- The virtual environmental stations publish on an MQTT channel the data from the sensors. The code for this is in the folder **environmental_station**;

- AWS is used to manage the MQTT broker. The messages received are also saved in a DynamoDB database;

- A web-based dashboard developed in javascript displays the current state of the sensors and the values received during the last hour. The code for this is in the folder **web_client**.

#### How to run
For information about how to run this part of the project check my blogpost on Hackster https://www.hackster.io/simone-bartolini/iot-environmental-station-using-aws-part-1-c01649

#### Demonstration
You can see this part of the project in action in this video https://www.youtube.com/watch?v=9jjE9SlO0yw



### Part 2: RiotOS MQTT-SN environmental station
In this second part the python script is replaced by a program for RiotOS, an operating system for embedded devices, running on the emulated "native" board.

#### Architecture
![](/images/architecture2.png)
- The IoT devices publish the sensor data on a topic using MQTT-SN. The code for this in in the folder **riot_environmental_station**;

- Eclipse mosquito RSMB is used as a MQTT-SN broker. The code for this in in the folder **MQTTSN-broker**;

- A python script act as an MQTT-SN to MQTT bridge subscribing to the topics on the MQTT-SN broker and republishing the messages on the same topics but over the AWS IoT MQTT broker. The code for this in in the folder **MQTTSN-bridge**;

- As in the first part of the project AWS saves the messages received into a DynamoDB table;

- The same web dashboard as before is used to display the data.

#### How to run
For information about how to run this part of the project check my blogpost on Hackster https://www.hackster.io/simone-bartolini/iot-environmental-station-using-aws-part-2-1da6cc

#### Demonstration
You can see this part of the project in action in this video https://youtu.be/aDZ3S6hlsIA



### Part 3: LoRaWAN environmental station
In this third part the environmental station is still a program for RiotOS, but it is designed to run on ST B-L072Z-LRWAN1 boards in order to use LoRaWAN for the communication.

#### Architecture
![](/images/architecture3.png)

- The IoT devices send the sensors data to the TTN backend using LoRaWAN. The code for this in in the folder **lora_environmental_station**;

- A python script acts as a bridge between TTN and AWS subscribing to the topics on TTN MQTT broker and republishing the messages over AWS IoT MQTT broker. The code for this in in the folder **lora-MQTT-bridge**;

- As in the first part of the project AWS saves the messages received into a DynamoDB table;

- The same web dashboard as before is used to display the data.


#### How to run
For information about how to run this part of the project check my blogpost on Hackster https://www.hackster.io/simone-bartolini/iot-environmental-station-using-aws-part-3-d928e6

#### Demonstration
You can see this part of the project in action in this video https://youtu.be/epP26noZgYs



## Assignment 4: IoT human activity recognition

This is an example of how to build a crowd-sensing IoT application using the sensors inside our smartphones to do human activity recognition.


### Part 1: Cloud-based architecture
In this first part the raw data from the sensors is sent to the cloud where is then performed the activity recognition.

#### Architecture
![](/images/architecture4a.png)

- A javascript web-app running on the smartphones collects the accelerometer raw data and publishes it on an MQTT topic. The code for this is in the folder **crowd-sensing/cloud-based/smartphone-webapp**;

- AWS is used to manage the MQTT broker;

- A stream processing application built using Apache Flink and running inside an AWS ECS container retrieves the raw data from the MQTT topic, analyzes it and publishes the results in another topic. The code for this is in the folder **crowd-sensing/cloud-based/cloud-code**;

- Both the raw data and the result of the processing are stored in a DynamoDB database;

- A web-based dashboard developed in javascript displays the latest raw data with the resulting activity and the values received during the last hour. The code for this is in the folder **crowd-sensing/cloud-based/web-dashboard**.


### Part 2: Edge-based architecture
In this second part the activity recognition is done on the smartphones and only the results are sent to the cloud.

#### Architecture
![](/images/architecture4b.png)

- A javascript web-app running on the smartphones collects the accelerometer raw data, analyzes it to recognize the activity and publishes the result on an MQTT topic. The code for this is in the folder **crowd-sensing/edge-based/smartphone-webapp**;

- AWS is used to manage the MQTT broker;

- The messages sent are stored in a DynamoDB database;

- A web-based dashboard developed in javascript displays the latest activity and the values received during the last hour. The code for this is in the folder **crowd-sensing/edge-based/web-dashboard**.



#### How to run
For information about how to run this project check my blogpost on Hackster https://www.hackster.io/simone-bartolini/iot-human-activity-recognition-using-aws-02c4fa

#### Demonstration
You can see the project in action in this video https://youtu.be/L2newT4ieqA
