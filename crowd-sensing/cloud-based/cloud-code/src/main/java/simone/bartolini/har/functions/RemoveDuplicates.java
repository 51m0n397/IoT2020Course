/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package simone.bartolini.har.functions;

import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.java.tuple.Tuple;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import simone.bartolini.har.model.ResultData;

/**
 * Process function for removing ResultData elements from the stream if they 
 * have the same status as their predecessor
 *
 * @author simbartolini@gmail.com
 */
public class RemoveDuplicates extends KeyedProcessFunction<Tuple, ResultData, 
                                                           ResultData> {
    private transient ValueState<String> previousState;
    
    @Override
    public void open(Configuration parameters) {
        ValueStateDescriptor<String> previousStateDescriptor = 
                new ValueStateDescriptor<>(
                "previousState",
                String.class);
        previousState = getRuntimeContext().getState(previousStateDescriptor);        
    }
    
    @Override
    public void processElement(ResultData in, Context ctx, 
                               Collector<ResultData> out) throws Exception {
        String previous = previousState.value();
        if(!in.getStatus().equals(previous)){
            out.collect(in);
        }
        previousState.update(in.getStatus());
    }
}
