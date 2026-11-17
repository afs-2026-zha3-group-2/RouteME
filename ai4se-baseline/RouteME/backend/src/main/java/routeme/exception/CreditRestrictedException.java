package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 账号处于信用限制：只读，写操作统一返回 403 CREDIT_RESTRICTED。
 */
public class CreditRestrictedException extends BusinessException {

    public CreditRestrictedException(long userId) {
        super("CREDIT_RESTRICTED", HttpStatus.FORBIDDEN, "credit restriction is active for user " + userId);
    }
}
