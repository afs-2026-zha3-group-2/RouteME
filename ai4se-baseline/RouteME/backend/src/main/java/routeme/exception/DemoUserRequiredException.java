package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 缺少或未知的演示身份。
 */
public class DemoUserRequiredException extends BusinessException {

    public DemoUserRequiredException(String message) {
        super("DEMO_USER_REQUIRED", HttpStatus.UNAUTHORIZED, message);
    }
}