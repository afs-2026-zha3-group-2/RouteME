package routeme.exception;

import org.springframework.http.HttpStatus;

/** Start was requested for a report that is not PENDING. */
public class ReportNotPendingException extends BusinessException {

    public ReportNotPendingException(long reportId, String status) {
        super("REPORT_NOT_PENDING", HttpStatus.CONFLICT, "report " + reportId + " is " + status + ", not PENDING");
    }
}