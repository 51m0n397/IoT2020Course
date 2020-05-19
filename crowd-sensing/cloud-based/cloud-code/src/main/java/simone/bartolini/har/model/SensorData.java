package simone.bartolini.har.model;

import java.io.Serializable;

/**
 * POJO object for a SensorData single value.
 *
 * @author simbartolini@gmail.com
 */
public class SensorData implements Serializable {

    private long timestamp;
    
    private String id;

    private double x;

    private double y;

    private double z;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }
    
    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getZ() {
        return z;
    }

    public void setZ(double z) {
        this.z = z;
    }


    @Override
    public String toString() {
        return "SensorData{" +
                "timestamp='" + timestamp +
                ", id=" + id +
                ", x=" + x +
                ", y=" + y +
                ", z=" + z +
                '}';
    }
}
