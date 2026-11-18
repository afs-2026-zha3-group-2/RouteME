package routeme.pojo;

/**
 * 钱包只读视图：余额为整数分（CNY）。
 */
public record UserWallet(long userId, int balanceCents) {

    public static final int INITIAL_BALANCE_CENTS = 1_000_000;
}