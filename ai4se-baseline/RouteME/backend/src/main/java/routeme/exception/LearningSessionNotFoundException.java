package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 考试会话不存在，或不属于当前用户。
 */
public class LearningSessionNotFoundException extends BusinessException {

    public LearningSessionNotFoundException(long sessionId) {
        super("LEARNING_SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "learning session not found: " + sessionId);
    }
}
