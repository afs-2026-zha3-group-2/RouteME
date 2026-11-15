package routeme.exception;

/**
 * 申请已处理（非待处理），不能再取消或再次处理。
 */
public class ApplicationNotPending extends RuntimeException {

    public ApplicationNotPending(long applicationId) {
        super("application is not pending: " + applicationId);
    }
}