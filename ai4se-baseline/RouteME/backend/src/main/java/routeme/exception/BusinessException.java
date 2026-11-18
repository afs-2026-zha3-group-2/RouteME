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

    /**
     * 带根因的业务异常：需要保留上游 I/O 原因（连接超时 / DNS 失败）时使用，
     * 便于调用方区分「网络不可达」与「上游返回错误」。
     *
     * @param code    契约错误码
     * @param status  HTTP 状态
     * @param message 错误细节
     * @param cause   根因
     */
    protected BusinessException(String code, HttpStatus status, String message, Throwable cause) {
        super(message, cause);
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