package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 行程已结束，不能再执行该操作。
 */
public class TripNotOpenException extends BusinessException {

    public TripNotOpenException(long tripId) {
        super("TRIP_NOT_OPEN", HttpStatus.CONFLICT, "trip is not open: " + tripId);
    }
}