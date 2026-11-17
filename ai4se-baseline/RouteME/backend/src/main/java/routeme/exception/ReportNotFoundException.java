package routeme.exception;

import org.springframework.http.HttpStatus;

/** Report id does not exist. */
public class ReportNotFoundException extends BusinessException {

    public ReportNotFoundException(long reportId) {
        super("REPORT_NOT_FOUND", HttpStatus.NOT_FOUND, "report not found: " + reportId);
    }
}