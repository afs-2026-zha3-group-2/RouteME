package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 当前用户不具备该行程的分享资格（未结束且未加入）。
 */
public class ExperienceNotAllowedException extends BusinessException {

    public ExperienceNotAllowedException(long tripId, long userId) {
        super("EXPERIENCE_NOT_ALLOWED", HttpStatus.FORBIDDEN,
                "experience not allowed for trip " + tripId + " and user " + userId);
    }
}