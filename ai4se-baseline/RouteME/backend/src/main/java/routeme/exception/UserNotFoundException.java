package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 用户不存在：公开资料入口指向的账户已被删除或从未存在。
 */
public class UserNotFoundException extends BusinessException {

    public UserNotFoundException(long userId) {
        super("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "user not found: " + userId);
    }
}
