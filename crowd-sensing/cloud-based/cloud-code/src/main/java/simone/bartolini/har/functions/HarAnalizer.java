package simone.bartolini.har.functions;

import org.apache.flink.api.common.functions.MapFunction;
import simone.bartolini.har.model.ResultData;
import simone.bartolini.har.model.SensorData;

/**
 * Map function for recognizing the activity from a SensorData object.
 *
 * @author simbartolini@gmail.com
 */
public class HarAnalizer implements MapFunction<SensorData, ResultData> {

    @Override
    public ResultData map(SensorData d) throws Exception {
        double sum = d.getX() + d.getY() + d.getZ();
        ResultData result = new ResultData();
        result.setId(d.getId());
        result.setTimestamp(d.getTimestamp());
        if (sum>0.8) {
            result.setStatus("Moving");
        } else {
            result.setStatus("Resting");
        }
        return result;
    }
    
}
