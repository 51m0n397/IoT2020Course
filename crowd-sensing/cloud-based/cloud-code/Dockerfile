FROM openjdk:8
EXPOSE 8883
COPY comp.jar /home/HAR.jar
COPY d5ea3b7aac-certificate.pem.crt /home/d5ea3b7aac-certificate.pem.crt
COPY d5ea3b7aac-private.pem.key /home/d5ea3b7aac-private.pem.key
WORKDIR /home
ENTRYPOINT java -jar HAR.jar