package routeme.exception;

import java.util.Map;

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

    /**
     * 字段级错误明细：只有资料校验使用，其余业务异常返回空 map。
     *
     * @return 字段名 → 原因码
     */
    public Map<String, String> fields() {
        return Map.of();
    }
}