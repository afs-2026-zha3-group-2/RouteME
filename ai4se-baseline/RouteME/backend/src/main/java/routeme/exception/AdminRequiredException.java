package routeme.exception;

import org.springframework.http.HttpStatus;

/** Caller is authenticated but does not hold the ADMIN role. */
public class AdminRequiredException extends BusinessException {

    public AdminRequiredException(String message) {
        super("ADMIN_REQUIRED", HttpStatus.FORBIDDEN, message);
    }
}