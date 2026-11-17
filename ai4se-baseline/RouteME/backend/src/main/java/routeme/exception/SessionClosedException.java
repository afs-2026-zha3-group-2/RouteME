package routeme.exception;

import org.springframework.http.HttpStatus;

/** A message was sent to a closed session. */
public class SessionClosedException extends BusinessException {

    public SessionClosedException(long sessionId) {
        super("SESSION_CLOSED", HttpStatus.CONFLICT, "session is closed: " + sessionId);
    }
}