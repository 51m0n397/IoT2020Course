package simone.bartolini.har.functions;

import com.google.gson.Gson;
import org.apache.flink.api.common.functions.MapFunction;
import simone.bartolini.har.model.ResultData;

/**
 * Map function for converting ResultData objects to JSON objects.
 *
 * @author simbartolini@gmail.com
 */
public class ExtractJson implements MapFunction<ResultData, String> {

    @Override
    public String map(ResultData value) throws Exception {
        Gson gson = new Gson();

        return gson.toJson(value);
    }
}
