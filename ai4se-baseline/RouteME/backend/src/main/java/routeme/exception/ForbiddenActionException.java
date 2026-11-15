package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 当前身份无权操作，暴露 FORBIDDEN。
 */
public class ForbiddenActionException extends BusinessException {

    public ForbiddenActionException(String message) {
        super("FORBIDDEN", HttpStatus.FORBIDDEN, message);
    }
}