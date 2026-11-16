package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 用户不存在，暴露 404 {@code USER_NOT_FOUND}。
 */
public class UserNotFoundException extends BusinessException {

    public UserNotFoundException(long userId) {
        super("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "user not found: " + userId);
    }
}