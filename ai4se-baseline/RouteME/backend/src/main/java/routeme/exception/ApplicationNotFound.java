package routeme.exception;

/**
 * 申请不存在；对外只暴露 APPLICATION_NOT_FOUND。
 */
public class ApplicationNotFound extends RuntimeException {

    public ApplicationNotFound(long applicationId) {
        super("application not found: " + applicationId);
    }
}