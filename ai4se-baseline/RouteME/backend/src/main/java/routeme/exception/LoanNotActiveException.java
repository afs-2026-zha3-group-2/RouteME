package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 借款已不是 {@code ACTIVE}（例如已还清），不能再次还款（409 {@code LOAN_NOT_ACTIVE}）。
 */
public class LoanNotActiveException extends BusinessException {

    public LoanNotActiveException(long loanId) {
        super("LOAN_NOT_ACTIVE", HttpStatus.CONFLICT, "loan is not active: " + loanId);
    }
}