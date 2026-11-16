package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 会话 token 缺失、不存在或已过期，暴露 401 {@code SESSION_INVALID}。
 */
public class SessionInvalidException extends BusinessException {

    public SessionInvalidException(String message) {
        super("SESSION_INVALID", HttpStatus.UNAUTHORIZED, message);
    }
}