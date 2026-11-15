package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 申请不处于待处理状态，不能再被接受或拒绝。
 */
public class ApplicationNotPendingException extends BusinessException {

    public ApplicationNotPendingException(long applicationId) {
        super("APPLICATION_NOT_PENDING", HttpStatus.CONFLICT, "application is not pending: " + applicationId);
    }
}