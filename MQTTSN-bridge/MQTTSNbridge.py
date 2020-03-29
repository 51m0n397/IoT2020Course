from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import MQTTSNclient
import time
import re

mqttClient = AWSIoTMQTTClient("MQTTSNbridge")
mqttSNClient = MQTTSNclient.Client("bridge", port=1885)

class Callback:
  def messageArrived(self, topicName, payload, qos, retained, msgid):
    print(topicName, payload.decode("utf-8"))
    mqttClient.publish(topicName, payload.decode("utf-8"), qos)
    return True

certFolder = "../environmental_station/"

mqttClient.configureEndpoint("a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com", 8883)
mqttClient.configureCredentials(certFolder+"AmazonRootCA1.pem.crt",
                                certFolder+"e0a2ae42f8-private.pem.key",
                                certFolder+"e0a2ae42f8-certificate.pem.crt")
mqttClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
mqttClient.configureDrainingFrequency(2)  # Draining: 2 Hz
mqttClient.configureConnectDisconnectTimeout(10)  # 10 sec
mqttClient.configureMQTTOperationTimeout(5)  # 5 sec

mqttSNClient.registerCallback(Callback())
mqttClient.connect()
mqttSNClient.connect()

ids = ""

while True:
    ids = input("Enter the IDs of the stations divided by ', '\n")
    if re.fullmatch("([0-9], )*[0-9]", ids) == None:
        print("ERROR: the value entered it's not correct")
    else: break

ids = ids.split(", ")

for id in ids:
    mqttSNClient.subscribe("stations/RiotOSEnvironmentalStation" + id)

while True:
    if input("Enter 'stop' to stop the stations\n")=='stop':
        break

mqttSNClient.disconnect()
mqttClient.disconnect()
