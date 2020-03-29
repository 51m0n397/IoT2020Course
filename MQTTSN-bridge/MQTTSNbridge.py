from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import MQTTSNclient
import time
import re

#creating client objects for mqtt and mqttsn
mqttClient = AWSIoTMQTTClient("MQTTSNbridge")
mqttSNClient = MQTTSNclient.Client("bridge", port=1885)

#callback object: used for replying the messages received from the mqttsn broker to the mqtt broker
class Callback:
  def messageArrived(self, topicName, payload, qos, retained, msgid):
    print(topicName, payload.decode("utf-8"))
    mqttClient.publish(topicName, payload.decode("utf-8"), qos)
    return True

#folder containing the certificates and the private key for authenticating with the AWS mqtt broker
certFolder = "../environmental_station/"

#athenticating with the AWS mqtt broker
#MAKE SHURE to insert the correct name for your endpoit, your certificates and the key.
mqttClient.configureEndpoint("a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com", 8883)
mqttClient.configureCredentials(certFolder+"AmazonRootCA1.pem.crt",
                                certFolder+"e0a2ae42f8-private.pem.key",
                                certFolder+"e0a2ae42f8-certificate.pem.crt")

#cconfiguring the mqtt broker
mqttClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
mqttClient.configureDrainingFrequency(2)  # Draining: 2 Hz
mqttClient.configureConnectDisconnectTimeout(10)  # 10 sec
mqttClient.configureMQTTOperationTimeout(5)  # 5 sec

#registering the callback
mqttSNClient.registerCallback(Callback())

#connecting the clients
mqttClient.connect()
mqttSNClient.connect()

#The RiotOS mqttsn clients are going to publish on the topics
#stations/RiotOSEnvironmentalStation + a number
#here I asks the user for this number
ids = ""
while True:
    ids = input("Enter the IDs of the stations divided by ', '\n")
    if re.fullmatch("([0-9], )*[0-9]", ids) == None:
        print("ERROR: the value entered it's not correct")
    else: break

#subscribing to the topics
ids = ids.split(", ")
for id in ids:
    mqttSNClient.subscribe("stations/RiotOSEnvironmentalStation" + id)

#waiting for user input to disconnect the clients and close the program
while True:
    if input("Enter 'stop' to stop the stations\n")=='stop':
        break

mqttSNClient.disconnect()
mqttClient.disconnect()
