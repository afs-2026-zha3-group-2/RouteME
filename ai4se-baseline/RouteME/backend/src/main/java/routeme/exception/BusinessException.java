package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 全局业务异常基类：每个子类只声明契约错误码、HTTP 状态与默认细节，
 * 由 {@code routeme.handler.GlobalExceptionHandler} 统一映射为 {@code ErrorResponse}。
 */
public abstract class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    protected BusinessException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String code() {
        return code;
    }

    public HttpStatus status() {
        return status;
    }
}