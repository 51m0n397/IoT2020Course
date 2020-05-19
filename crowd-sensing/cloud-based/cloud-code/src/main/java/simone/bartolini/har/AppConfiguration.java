package simone.bartolini.har;

import com.amazonaws.services.iot.client.AWSIotQos;

/**
 * Configuration parameters for AWS iot.
 * Make sure to put in 'brokerHost' your endpoint name and in 'certificateFile'
 * and 'privateKeyFile' the correct path of your certificate and private key.
 * 
 * @author simbartolini@gmail.com
 */
public interface AppConfiguration {

    public final String brokerHost = "a29wnmzjyb35x8-ats.iot.us-east-1.amazonaws.com";

    public final int brokerPort = 8883;

    public final String brokerProtocol = "ssl";

    public final String brokerURL = brokerProtocol + "://" + brokerHost + ":" + brokerPort;

    public final String topic = "CloudComputing/+";

    public final AWSIotQos qos = AWSIotQos.QOS0;

    public final String outExchange = "CloudComputingResult";

    public final String certificateFile = "./d5ea3b7aac-certificate.pem.crt";

    public final String privateKeyFile = "./d5ea3b7aac-private.pem.key";

}
