package simone.bartolini.har.functions;

import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.java.tuple.Tuple;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import simone.bartolini.har.model.SensorData;

/**
 * Process function for applying a high pass filter to the SensorData stream.
 *
 * @author simbartolini@gmail.com
 */
public class HighPassFilter extends KeyedProcessFunction<Tuple, SensorData, 
                                                         SensorData> {
    private final double alpha;
    private transient ValueState<SensorData> previousFilteredState;
    private transient ValueState<SensorData> previousSampleState;

    
    public HighPassFilter(double cutoff, double sampleRate) {
        double rc = 1.0 / (cutoff * 2 * Math.PI);
        double dt = 1.0 / sampleRate;
        alpha = rc / (rc + dt);
    }
    
    @Override
    public void open(Configuration parameters) {
        ValueStateDescriptor<SensorData> previousFilteredDescriptor = 
                new ValueStateDescriptor<>(
                "previousFiltered",
                SensorData.class);
        previousFilteredState = getRuntimeContext()
                .getState(previousFilteredDescriptor);
        
        ValueStateDescriptor<SensorData> previousSampleDescriptor = 
                new ValueStateDescriptor<>(
                "previousSample",
                SensorData.class);
        previousSampleState = getRuntimeContext()
                .getState(previousSampleDescriptor);
    }

    @Override
    public void processElement(SensorData in, Context ctx, 
                               Collector<SensorData> out) throws Exception {
        SensorData previousFiltered = previousFilteredState.value();
        SensorData previousSample = previousSampleState.value();
        if (previousFiltered == null) {
            previousFilteredState.update(in);
            previousSampleState.update(in);
            out.collect(in);
        } else {
            SensorData result = new SensorData();
            result.setX(alpha * (previousFiltered.getX() + in.getX() 
                                 - previousSample.getX()));
            result.setY(alpha * (previousFiltered.getY() + in.getY() 
                                 - previousSample.getY()));
            result.setZ(alpha * (previousFiltered.getZ() + in.getZ() 
                                 - previousSample.getZ()));
            result.setTimestamp(in.getTimestamp());
            result.setId(in.getId());
            
            previousFilteredState.update(result);
            previousSampleState.update(in);
            out.collect(result);
        }
    }
    
    
}
