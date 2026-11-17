package routeme.exception;

import org.springframework.http.HttpStatus;

/** The requested account status transition is not allowed. */
public class InvalidStatusTransitionException extends BusinessException {

    public InvalidStatusTransitionException(String message) {
        super("INVALID_STATUS_TRANSITION", HttpStatus.CONFLICT, message);
    }
}