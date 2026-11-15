package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 申请不存在。
 */
public class ApplicationNotFoundException extends BusinessException {

    public ApplicationNotFoundException(long applicationId) {
        super("APPLICATION_NOT_FOUND", HttpStatus.NOT_FOUND, "application not found: " + applicationId);
    }
}