package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 当前信用分达到恢复目标，无需参加安全学习。
 */
public class LearningNotEligibleException extends BusinessException {

    public LearningNotEligibleException(int score) {
        super("LEARNING_NOT_ELIGIBLE", HttpStatus.CONFLICT, "credit score needs no recovery: " + score);
    }
}
