import paho.mqtt.client as mqtt
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import json

ttnClient = mqtt.Client()
awsClient = AWSIoTMQTTClient("TTNbridge")


# The callback for when the TTN MQTT client connects.
def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))
    # Subscribing in on_connect() means that if we lose the connection and
    # reconnect then subscriptions will be renewed.
    client.subscribe("+/devices/+/up")

# The callback for when a message is received from the TTN broker.
# When a message from TTN is received the "payload_fields" field is estracted
# and published to the AWS MQTT broker on the topic "stations/" + the id
# of the device that sent the message.
def on_message(client, userdata, msg):
    parsed_json = (json.loads(msg.payload.decode("utf-8")))
    print("stations/"+parsed_json["dev_id"],
          json.dumps(parsed_json["payload_fields"]))
    awsClient.publish("stations/"+parsed_json["dev_id"],
                      json.dumps(parsed_json["payload_fields"]), 0)


# AWS client configuration.

# Folder containing the certificates and the private key for
# authenticating with the AWS mqtt broker.
certFolder = "../environmental_station/"

# Athenticating with the AWS mqtt broker.
# MAKE SHURE to insert the correct name for your endpoit,
# your certificates and the key.
awsClient.configureEndpoint("a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com",
                            8883)
awsClient.configureCredentials(certFolder + "AmazonRootCA1.pem.crt",
                               certFolder + "e0a2ae42f8-private.pem.key",
                               certFolder + "e0a2ae42f8-certificate.pem.crt")

# Configuring the mqtt broker.
awsClient.configureOfflinePublishQueueing(-1)  # Infinite queue
awsClient.configureDrainingFrequency(2)  # Draining: 2 Hz
awsClient.configureConnectDisconnectTimeout(10)  # 10 sec
awsClient.configureMQTTOperationTimeout(5)  # 5 sec


# TTN client configuration.
# MAKE SHURE that in the same folder as this scipt there is the certificate
# of the TTN CA "mqtt-ca.pem.crt" and a file "key.txt" containing on the first
# line the name of your TTN application and on the second line the relative
# access key.
ttnClient.on_connect = on_connect
ttnClient.on_message = on_message
with open("key.txt", "r") as key:
    ttnClient.username_pw_set(key.readline().strip(), key.readline().strip())
ttnClient.tls_set(ca_certs="mqtt-ca.pem.crt")


# Connecting the clients.
ttnClient.connect("eu.thethings.network", 8883, 60)
awsClient.connect()


ttnClient.loop_start()

# Main cicle.
while True:
    if input("Enter 'stop' to stop the bridge\n") == 'stop':
        break

ttnClient.loop_stop()


# Disconnectin the clients.
ttnClient.disconnect()
awsClient.disconnect()
