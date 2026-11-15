package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 输入不满足业务约束，暴露 INVALID_INPUT，字段细节进日志。
 */
public class InvalidInputException extends BusinessException {

    public InvalidInputException(String message) {
        super("INVALID_INPUT", HttpStatus.BAD_REQUEST, message);
    }
}