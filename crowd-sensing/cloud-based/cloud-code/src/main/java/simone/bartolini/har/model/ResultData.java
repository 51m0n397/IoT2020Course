package simone.bartolini.har.model;

import java.io.Serializable;

/**
 * POJO object for a ResultData single value.
 *
 * @author simbartolini@gmail.com
 */
public class ResultData implements Serializable {
    private long timestamp;
    private String id;
    private String status;

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "ResultData{" + 
                "timestamp=" + timestamp + 
                ", id=" + id + 
                ", status=" + status + 
                '}';
    }
    
}
