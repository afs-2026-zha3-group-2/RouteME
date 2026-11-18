package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 本月已恢复过一次，不再接受恢复。
 */
public class LearningRecoveryQuotaExceededException extends BusinessException {

    public LearningRecoveryQuotaExceededException(String monthKey) {
        super("LEARNING_RECOVERY_QUOTA_EXCEEDED", HttpStatus.CONFLICT,
                "monthly recovery quota used up: " + monthKey);
    }
}
