package simone.bartolini.har.functions;

import com.google.gson.Gson;
import simone.bartolini.har.model.SensorData;
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.util.Collector;

/**
 * Map function for converting MQTT Message payloads to SensorData objects.
 *
 * @author simbartolini@gmail.com
 */
public class ParseMeasurement implements FlatMapFunction<byte[], SensorData> {

    public void flatMap(byte[] message, Collector<SensorData> out) 
            throws Exception {
        Gson gson = new Gson();

        SensorData[] array = gson.fromJson(new String(message, "UTF-8"), 
                                           SensorData[].class);
        for (int i=0; i<array.length; i++){
            out.collect(array[i]);
        }
    }

}
