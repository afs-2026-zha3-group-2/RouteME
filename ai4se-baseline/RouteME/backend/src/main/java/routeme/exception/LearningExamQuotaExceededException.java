package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 本月考试次数已用尽。
 */
public class LearningExamQuotaExceededException extends BusinessException {

    public LearningExamQuotaExceededException(String monthKey) {
        super("LEARNING_EXAM_QUOTA_EXCEEDED", HttpStatus.TOO_MANY_REQUESTS, "monthly exam quota used up: " + monthKey);
    }
}
