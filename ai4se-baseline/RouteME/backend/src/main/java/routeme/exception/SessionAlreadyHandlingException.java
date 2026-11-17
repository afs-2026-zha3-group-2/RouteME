package routeme.exception;

import org.springframework.http.HttpStatus;

/** Another administrator already joined the waiting session. */
public class SessionAlreadyHandlingException extends BusinessException {

    public SessionAlreadyHandlingException(long sessionId) {
        super("SESSION_ALREADY_HANDLING", HttpStatus.CONFLICT, "session already handled: " + sessionId);
    }
}