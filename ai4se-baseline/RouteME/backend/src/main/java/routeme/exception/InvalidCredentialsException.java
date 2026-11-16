package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 用户名不存在、密码错误或账户没有密码凭据，统一暴露 401 {@code INVALID_CREDENTIALS}。
 */
public class InvalidCredentialsException extends BusinessException {

    public InvalidCredentialsException(String message) {
        super("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, message);
    }
}