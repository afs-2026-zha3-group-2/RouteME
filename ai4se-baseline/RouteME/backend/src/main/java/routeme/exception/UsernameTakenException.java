package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 注册用户名已被占用，暴露 409 {@code USERNAME_TAKEN}。
 */
public class UsernameTakenException extends BusinessException {

    public UsernameTakenException(String message) {
        super("USERNAME_TAKEN", HttpStatus.CONFLICT, message);
    }
}