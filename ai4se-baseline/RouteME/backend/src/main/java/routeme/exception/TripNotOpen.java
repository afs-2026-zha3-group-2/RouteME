package routeme.exception;

/**
 * 行程已结束，不能再执行该操作。
 */
public class TripNotOpen extends RuntimeException {

    public TripNotOpen(long tripId) {
        super("trip is not open: " + tripId);
    }
}