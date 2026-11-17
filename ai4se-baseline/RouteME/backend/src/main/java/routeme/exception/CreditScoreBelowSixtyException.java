package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 信用分低于 60，不允许发布行程（唯一拦截面）。
 */
public class CreditScoreBelowSixtyException extends BusinessException {

    public CreditScoreBelowSixtyException(int score) {
        super("CREDIT_SCORE_BELOW_60", HttpStatus.FORBIDDEN, "credit score below 60: " + score);
    }
}
