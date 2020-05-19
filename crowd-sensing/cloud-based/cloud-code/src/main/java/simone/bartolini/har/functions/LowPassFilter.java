package simone.bartolini.har.functions;

import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.java.tuple.Tuple;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import simone.bartolini.har.model.SensorData;

/**
 * Process function for applying a low pass filter to the SensorData stream.
 *
 * @author simbartolini@gmail.com
 */
public class LowPassFilter extends KeyedProcessFunction<Tuple, SensorData, 
                                                        SensorData> {
    private final double alpha;
    private transient ValueState<SensorData> previousState;
    
    public LowPassFilter(double cutoff, double sampleRate) {
        double rc = 1.0 / (cutoff * 2 * Math.PI);
        double dt = 1.0 / sampleRate;
        alpha = dt / (rc + dt);
    }
    
    @Override
    public void open(Configuration parameters) {
        ValueStateDescriptor<SensorData> previousDescriptor = 
                new ValueStateDescriptor<>(
                "previous",
                SensorData.class);
        previousState = getRuntimeContext().getState(previousDescriptor);
    }
    
    @Override
    public void processElement(SensorData in, Context ctx, 
                               Collector<SensorData> out) throws Exception {
        SensorData previous = previousState.value();
        if (previous == null) {
            previousState.update(in);
            out.collect(in);
        } else {                       
            SensorData result = new SensorData();
            result.setX(previous.getX() + alpha * (in.getX() - previous.getX()));
            result.setY(previous.getY() + alpha * (in.getY() - previous.getY()));
            result.setZ(previous.getZ() + alpha * (in.getZ() - previous.getZ()));
            result.setTimestamp(in.getTimestamp()); 
            result.setId(in.getId());
            previousState.update(result);
            out.collect(result);
        }
    }
    
}
