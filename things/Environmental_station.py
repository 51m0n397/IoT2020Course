#import libraries
import random
from threading import Thread
import time
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

class EnvironmentalStation(Thread):
    temperature = 0
    humidity = 0
    windDirection = 0
    windIntensity = 0
    rainHeight = 0

    def __init__(self, name):
        Thread.__init__(self)
        self.name = name
        self.MQTTClient = AWSIoTMQTTClient(name)

    def updateSensors(self):
        self.temperature = random.randint(-50, 51)
        self.humidity = random.randint(0, 101)
        self.windDirection = random.randint(0, 361)
        self.windIntensity = random.randint(0, 101)
        self.rainHeight = random.randint(0, 51)

    def publish(self):
        return self.MQTTClient.publish("stations/" + self.name,
                                       '{"temperature": "' + str(self.temperature) + '",' +
                                        '"humidity": "' + str(self.humidity) + '",' +
                                        '"windDirection": "' + str(self.windDirection) + '",' +
                                        '"windIntensity": "' + str(self.windIntensity) + '",' +
                                        '"rainHeight": "' + str(self.rainHeight) + '"}', 0)

    def configureMQTT(self):
        self.MQTTClient.configureEndpoint("a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com", 8883)
        self.MQTTClient.configureCredentials("AmazonRootCA1.pem.crt", "e0a2ae42f8-private.pem.key",
                                             "e0a2ae42f8-certificate.pem.crt")
        self.MQTTClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
        self.MQTTClient.configureDrainingFrequency(2)  # Draining: 2 Hz
        self.MQTTClient.configureConnectDisconnectTimeout(10)  # 10 sec
        self.MQTTClient.configureMQTTOperationTimeout(5)  # 5 sec

    def connect(self):
        return self.MQTTClient.connect()

    def disconnect(self):
        return self.MQTTClient.disconnect()

    def run(self):
        self.configureMQTT()
        while start:
            time.sleep(600)
            try:
                self.connect()
            except:
                continue
            self.updateSensors()
            self.publish()
            self.disconnect()

numStation = 0
while True:
    numStation = input("Enter the number of environmental station to launch\n")
    try:
        numStation = int(numStation)
    except:
        print("ERROR: the value entered is not a number")
        continue
    break

stationList = []
for i in range(0, numStation):
    stationList.append(EnvironmentalStation("environmentalStation" + str(i)))

start = True
for station in stationList:
    station.start()

while True:
    if input("Enter 'stop' to stop the stations\n")=='stop':
        start = False
        for station in stationList:
            station.join()
        break
