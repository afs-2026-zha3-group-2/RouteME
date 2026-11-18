package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * AI 输出非 JSON、必需字段缺失或 POI 少于 2：暴露 AI_INVALID_OUTPUT。
 * 不自动重试（L-03），避免放大上游配额消耗；由前端 Retry 驱动。
 */
public class AiInvalidOutputException extends BusinessException {

    public AiInvalidOutputException(String message) {
        super("AI_INVALID_OUTPUT", HttpStatus.BAD_GATEWAY, message);
    }
}