package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * AI Key 未配置（空白）：暴露 AI_NOT_CONFIGURED，不发起任何上游调用。
 */
public class AiNotConfiguredException extends BusinessException {

    public AiNotConfiguredException(String message) {
        super("AI_NOT_CONFIGURED", HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}