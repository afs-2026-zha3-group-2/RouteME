package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 行程不存在。
 */
public class TripNotFoundException extends BusinessException {

    public TripNotFoundException(long tripId) {
        super("TRIP_NOT_FOUND", HttpStatus.NOT_FOUND, "trip not found: " + tripId);
    }
}