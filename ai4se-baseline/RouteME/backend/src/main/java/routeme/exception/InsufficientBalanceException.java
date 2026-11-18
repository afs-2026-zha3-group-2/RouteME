package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 钱包余额不足以支付本次交易。余额、保单 / 借款与流水均不改变。
 */
public class InsufficientBalanceException extends BusinessException {

    public InsufficientBalanceException(long userId, int requiredCents, int availableCents) {
        super(
                "INSUFFICIENT_BALANCE",
                HttpStatus.CONFLICT,
                "insufficient balance for user " + userId + ": need " + requiredCents + ", have " + availableCents);
    }
}