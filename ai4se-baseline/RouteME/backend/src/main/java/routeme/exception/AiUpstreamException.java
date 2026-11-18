package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * AI 上游网络失败、非 2xx 或超时：暴露 AI_UPSTREAM_ERROR，
 * 不产出伪造行程，由前端 Retry 驱动重试。
 */
public class AiUpstreamException extends BusinessException {

    public AiUpstreamException(String message) {
        super("AI_UPSTREAM_ERROR", HttpStatus.BAD_GATEWAY, message);
    }
}