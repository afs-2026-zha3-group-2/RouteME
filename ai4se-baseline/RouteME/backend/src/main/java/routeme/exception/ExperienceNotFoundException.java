package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 体验不存在：点赞与取消点赞共用，避免暴露「不存在」以外的信息。
 */
public class ExperienceNotFoundException extends BusinessException {

    public ExperienceNotFoundException(long experienceId) {
        super("EXPERIENCE_NOT_FOUND", HttpStatus.NOT_FOUND, "experience not found: " + experienceId);
    }
}
