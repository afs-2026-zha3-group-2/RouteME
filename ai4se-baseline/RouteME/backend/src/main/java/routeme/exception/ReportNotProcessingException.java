package routeme.exception;

import org.springframework.http.HttpStatus;

/** Resolve was requested for a report that is not PROCESSING. */
public class ReportNotProcessingException extends BusinessException {

    public ReportNotProcessingException(long reportId, String status) {
        super("REPORT_NOT_PROCESSING", HttpStatus.CONFLICT, "report " + reportId + " is " + status + ", not PROCESSING");
    }
}