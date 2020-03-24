#import libraries
import random
import threading
import time
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

#Class representing the environmental station.
class EnvironmentalStation(threading.Thread):
    def __init__(self, name):
        threading.Thread.__init__(self)
        self.name = name
        self.MQTTClient = AWSIoTMQTTClient(name)
        self.temperature = 0
        self.humidity = 0
        self.windDirection = 0
        self.windIntensity = 0
        self.rainHeight = 0

#Method that simulates the collecting of data from the sensors by randomly generating the numbers.
    def updateSensors(self):
        self.temperature = random.randint(-50, 50)
        self.humidity = random.randint(0, 100)
        self.windDirection = random.randint(0, 360)
        self.windIntensity = random.randint(0, 100)
        self.rainHeight = random.randint(0, 50)

#Method for publishing the current status of the sensors on the MQTT channel.
#It takes in input a number representing the QoS level.
#The messages are published on the topic station/<NAME_OF_STATION>.
    def publish(self, QoS):
        return self.MQTTClient.publish("stations/" + self.name,
                                       '{"temperature": "' + str(self.temperature) + '",' +
                                        '"humidity": "' + str(self.humidity) + '",' +
                                        '"windDirection": "' + str(self.windDirection) + '",' +
                                        '"windIntensity": "' + str(self.windIntensity) + '",' +
                                        '"rainHeight": "' + str(self.rainHeight) + '"}', QoS)

#Method for configuring the MQTT client.
#It takes in input the endpoint name
#and the location of the rootCA certificate, the client private key and the client certificate.
    def configureMQTT(self, endpoint, rootCA, privateKey, clientCert):
        self.MQTTClient.configureEndpoint(endpoint, 8883)
        self.MQTTClient.configureCredentials(rootCA, privateKey, clientCert)
        self.MQTTClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
        self.MQTTClient.configureDrainingFrequency(2)  # Draining: 2 Hz
        self.MQTTClient.configureConnectDisconnectTimeout(10)  # 10 sec
        self.MQTTClient.configureMQTTOperationTimeout(5)  # 5 sec

#Method for connecting the MQTT client to the broker.
    def connect(self):
        return self.MQTTClient.connect()

#Method for disconnecting the MQTT client.
    def disconnect(self):
        return self.MQTTClient.disconnect()

#Run method of the environmentalStation thread.
#It starts by configuring the MQTT client.
#Then it enters a loop in which it tries to connect to the broker,
#it updates the values of the sensors and publishes them with QoS 0
#and finally it disconnects and waits for "time" seconds.
#It exits from the loop when the main thread sets the event quit.
    def run(self):
        #In this case the certificates and the key are in the same folder as this script.
        #MAKE SHURE to insert the correct name for your endpoit
        #and the correct location for the certificates and the key.
        self.configureMQTT("a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com", "AmazonRootCA1.pem.crt",
                           "e0a2ae42f8-private.pem.key", "e0a2ae42f8-certificate.pem.crt")
        while not quit.is_set():
            try:
                self.connect()
            except:
                continue
            self.updateSensors()
            self.publish(0)
            self.disconnect()
            quit.wait(time)

quit = threading.Event() #quit event used to stop the threads
numStation = 0 #number of stations to simulate
time = 0 #time to wait between each publish

#setting the number of stations
while True:
    numStation = input("Enter the number of environmental station to launch\n")
    try:
        numStation = int(numStation)
    except:
        print("ERROR: the value entered is not a number")
        continue
    break

#setting the time to wait
while True:
    time = input("Enter the number of seconds to pass between each publish\n")
    try:
        time = int(time)
    except:
        print("ERROR: the value entered is not a number")
        continue
    break

#creating the environmentalStation objects
stationList = []
for i in range(0, numStation):
    stationList.append(EnvironmentalStation("environmentalStation" + str(i)))

#spawning the environmentalStation threads
for station in stationList:
    station.start()

#waiting for user input to stop the threads and close the program
while True:
    if input("Enter 'stop' to stop the stations\n")=='stop':
        quit.set()
        for station in stationList:
            station.join()
        break
