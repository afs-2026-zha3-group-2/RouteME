package routeme.exception;

/**
 * 行程不存在。
 */
public class TripNotFound extends RuntimeException {

    public TripNotFound(long tripId) {
        super("trip not found: " + tripId);
    }
}