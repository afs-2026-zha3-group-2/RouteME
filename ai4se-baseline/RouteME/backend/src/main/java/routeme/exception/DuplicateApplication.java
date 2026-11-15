package routeme.exception;

/**
 * 已有待处理或已接受的申请，不能重复提交。
 */
public class DuplicateApplication extends RuntimeException {

    public DuplicateApplication(long tripId, long applicantId) {
        super("duplicate application for trip " + tripId + " by user " + applicantId);
    }
}