package routeme.exception;

import org.springframework.http.HttpStatus;

/** An administrator tried to suspend or ban the account they are signed in with. */
public class CannotTargetSelfException extends BusinessException {

    public CannotTargetSelfException(long adminId) {
        super("CANNOT_TARGET_SELF", HttpStatus.CONFLICT, "administrator cannot penalize self: " + adminId);
    }
}