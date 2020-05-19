package simone.bartolini.har.functions;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import org.apache.flink.api.java.tuple.Tuple;
import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
import org.apache.flink.streaming.api.windowing.windows.GlobalWindow;
import org.apache.flink.util.Collector;
import simone.bartolini.har.model.SensorData;


/**
 * Window function for applying a median filter to the SensorData stream.
 *
 * @author simbartolini@gmail.com
 */
public class MedianFilter implements WindowFunction<SensorData, SensorData, 
                                                    Tuple, GlobalWindow> {

    @Override
    public void apply(Tuple key, GlobalWindow w, Iterable<SensorData> elements, 
                      Collector<SensorData> out) throws Exception {
        SensorData result = new SensorData();
        ArrayList<Double> x = new ArrayList<>();
        ArrayList<Double> y = new ArrayList<>();
        ArrayList<Double> z = new ArrayList<>();
        Iterator<SensorData> itr = elements.iterator();

        SensorData first = itr.next();
        x.add(first.getX());
        y.add(first.getY());
        z.add(first.getZ());
        result.setTimestamp(first.getTimestamp());
        result.setId(first.getId());
        while (itr.hasNext()) { 
            SensorData next = itr.next();
            x.add(next.getX());
            y.add(next.getY());
            z.add(next.getZ());
        }
        
        Collections.sort(x);
        Collections.sort(y);
        Collections.sort(z);
        
        int windowSize = x.size();
        
        if(windowSize % 2 == 0){
            int i = windowSize/2;
            result.setX((x.get(i) + x.get(i-1)) / 2);
            result.setY((y.get(i) + y.get(i-1)) / 2);
            result.setZ((z.get(i) + z.get(i-1)) / 2);
        } else {
            int i = (windowSize-1)/2;
            result.setX(x.get(i));
            result.setY(y.get(i));
            result.setZ(z.get(i));
        }
        
        out.collect(result);
    }

     
}
