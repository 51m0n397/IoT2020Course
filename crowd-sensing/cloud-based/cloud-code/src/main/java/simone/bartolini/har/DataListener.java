package simone.bartolini.har;

import org.apache.flink.streaming.api.TimeCharacteristic;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.DataStreamSink;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.log4j.BasicConfigurator;
import simone.bartolini.har.connector.AWSIoTMqttSink;
import simone.bartolini.har.connector.AWSIoTMqttStream;
import simone.bartolini.har.functions.AbsAverage;
import simone.bartolini.har.functions.ExtractJson;
import simone.bartolini.har.functions.HarAnalizer;
import simone.bartolini.har.functions.HighPassFilter;
import simone.bartolini.har.functions.LowPassFilter;
import simone.bartolini.har.functions.MedianFilter;
import simone.bartolini.har.functions.ParseMeasurement;
import simone.bartolini.har.functions.RemoveDuplicates;
import simone.bartolini.har.model.ResultData;
import simone.bartolini.har.model.SensorData;

/**
 * Main class of the program, it analyzes the stream of data from the devices
 * and publishes the results on an MQTT topic.
 *
 * @author simbartolini@gmail.com
 */
public class DataListener {
    public static void main(String[] args) throws Exception {

        // Sets up a simple configuration that logs on the console.
        BasicConfigurator.configure();

        // The StreamExecutionEnvironment is the context in which a program
        // is executed.
        final StreamExecutionEnvironment env = StreamExecutionEnvironment
                .getExecutionEnvironment();
        env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime);

        // The input stream from the MQTT topic.
        DataStream<byte[]> awsStream = env
                .addSource(new AWSIoTMqttStream(AppConfiguration.brokerHost,
                           "flink", AppConfiguration.certificateFile,
                           AppConfiguration.privateKeyFile,
                           AppConfiguration.topic, AppConfiguration.qos));

        // Converts the messages into SensorData.
        final DataStream<SensorData> dataStream = awsStream
                .flatMap(new ParseMeasurement());

        // The frequency at which the data is sampled from the sensors. This is
        // needed for the filtering. Make sure it is the same as in the code
        // running on the smartphones.
        int samplingFrequency = 4;

        // Applies a median filter to the data.
        final DataStream<SensorData> medianFilterStream = dataStream
                .keyBy("id")
                .countWindow(samplingFrequency, 1)
                .apply(new MedianFilter());

        // Applies a low pass filter to the data.
        final DataStream<SensorData> lowPassFilterStream = medianFilterStream
                .keyBy("id")
                .process(new LowPassFilter(20, samplingFrequency));

        // Applies a high pass filter to the data.
        final DataStream<SensorData> highPassFilterStream = lowPassFilterStream
                .keyBy("id")
                .process(new HighPassFilter(0.3, samplingFrequency));

        // Defines the window and apply the reduce transformation.
        final DataStream<SensorData> averageStream = highPassFilterStream
                .keyBy("id")
                .countWindow(samplingFrequency*3, samplingFrequency*3/2)
                .reduce(new AbsAverage());

        // Analyzes the data to recognize the activity.
        final DataStream<ResultData> resultStream = averageStream
                .keyBy("id")
                .map(new HarAnalizer())
                .keyBy("id")
                .process(new RemoveDuplicates());


        // Converts the result data into json.
        final DataStream<String> jsonStream = resultStream
                .map(new ExtractJson());

        // Publishes the data into the output topic.
        final DataStreamSink<String> finalStream = jsonStream
                .addSink(new AWSIoTMqttSink(AppConfiguration.brokerHost,
                         "flink", AppConfiguration.certificateFile,
                         AppConfiguration.privateKeyFile,
                         AppConfiguration.outExchange, AppConfiguration.qos));

        jsonStream.print().setParallelism(1);

        env.execute("Data Listener");
    }
}
