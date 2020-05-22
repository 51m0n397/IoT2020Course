FROM openjdk:8
EXPOSE 8883
COPY HAR.jar /home/HAR.jar
COPY <CERTIFICATE>.pem.crt /home/<CERTIFICATE>.pem.crt
COPY <PRIVATE_KEY>.pem.key /home/<PRIVATE_KEY>.pem.key
WORKDIR /home
ENTRYPOINT java -jar HAR.jar
