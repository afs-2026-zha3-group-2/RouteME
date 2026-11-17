package routeme.exception;

import org.springframework.http.HttpStatus;

/** SUSPENDED account attempted a business write. */
public class AccountSuspendedException extends BusinessException {

    public AccountSuspendedException(String message) {
        super("ACCOUNT_SUSPENDED", HttpStatus.FORBIDDEN, message);
    }
}