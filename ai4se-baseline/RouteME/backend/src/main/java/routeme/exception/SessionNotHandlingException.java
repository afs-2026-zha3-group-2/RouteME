package routeme.exception;

import org.springframework.http.HttpStatus;

/** Close was requested for a session that is not HANDLING. */
public class SessionNotHandlingException extends BusinessException {

    public SessionNotHandlingException(long sessionId) {
        super("SESSION_NOT_HANDLING", HttpStatus.CONFLICT, "session is not HANDLING: " + sessionId);
    }
}