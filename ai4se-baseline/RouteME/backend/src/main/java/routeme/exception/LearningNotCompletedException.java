package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 尚未完成本页学习内容就提交作答。
 */
public class LearningNotCompletedException extends BusinessException {

    public LearningNotCompletedException(long sessionId) {
        super("LEARNING_NOT_COMPLETED", HttpStatus.CONFLICT, "learning lessons not completed: " + sessionId);
    }
}
