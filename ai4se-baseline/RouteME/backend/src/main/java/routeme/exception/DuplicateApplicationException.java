package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 同一用户对同一行程重复申请。
 */
public class DuplicateApplicationException extends BusinessException {

    public DuplicateApplicationException(long tripId, long applicantId) {
        super("DUPLICATE_APPLICATION", HttpStatus.CONFLICT,
                "duplicate application for trip " + tripId + " by user " + applicantId);
    }
}