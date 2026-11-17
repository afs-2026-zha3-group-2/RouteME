package routeme.exception;

import org.springframework.http.HttpStatus;

/** Registration email already belongs to another account. */
public class EmailTakenException extends BusinessException {

    public EmailTakenException(String email) {
        super("EMAIL_TAKEN", HttpStatus.CONFLICT, "email already registered: " + email);
    }
}