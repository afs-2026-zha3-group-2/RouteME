package routeme.exception;

import org.springframework.http.HttpStatus;

/** BANNED account attempted any write. */
public class AccountBannedException extends BusinessException {

    public AccountBannedException(String message) {
        super("ACCOUNT_BANNED", HttpStatus.FORBIDDEN, message);
    }
}