package simone.bartolini.har.functions;

import org.apache.flink.api.common.functions.ReduceFunction;
import simone.bartolini.har.model.SensorData;

/**
 * Reduce function for calculating the average of the absolute value of the 
 * accelerometer data from two SensorData objects.
 * 
 * @author simbartolini@gmail.com
 */
public class AbsAverage implements ReduceFunction<SensorData> {

    @Override
    public SensorData reduce(SensorData a, SensorData b) throws Exception {
        SensorData result = new SensorData();
        result.setId(a.getId());
        result.setTimestamp(a.getTimestamp() < b.getTimestamp() ? 
                            a.getTimestamp() : b.getTimestamp());
        result.setX((Math.abs(a.getX())+Math.abs(b.getX()))/2);
        result.setY((Math.abs(a.getY())+Math.abs(b.getY()))/2);
        result.setZ((Math.abs(a.getZ())+Math.abs(b.getZ()))/2);
        return result;
    }
    
}
