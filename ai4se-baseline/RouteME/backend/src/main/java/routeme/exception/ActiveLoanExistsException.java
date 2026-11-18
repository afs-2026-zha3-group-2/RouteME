package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 用户已有一笔状态为 {@code ACTIVE} 的借款（409 {@code ACTIVE_LOAN_EXISTS}）。
 */
public class ActiveLoanExistsException extends BusinessException {

    public ActiveLoanExistsException(long userId) {
        super("ACTIVE_LOAN_EXISTS", HttpStatus.CONFLICT, "active loan already exists for user " + userId);
    }
}