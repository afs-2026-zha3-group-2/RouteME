package routeme.constant;

import java.time.Duration;
import java.time.Instant;

/**
 * 旅行金融的费率：借款从本金扣除 5% 服务费，另按日利率计息、逾期按日罚息；保险由第三方定价，
 * RouteMe 不收服务费。纯整数运算，四舍五入到分。
 */
public final class FinanceFeeConstant {

    public static final int FEE_RATE_PERCENT = 5;
    /** 借款日利率 0.05%（万分之五），按本金与期限天数计息。 */
    public static final int DAILY_INTEREST_BPS = 5;
    /** 逾期日罚息 0.1%（万分之十），按本金与已开始的逾期天数累计。 */
    public static final int DAILY_PENALTY_BPS = 10;

    private static final long SECONDS_PER_DAY = 86_400;
    private static final long BPS_DENOMINATOR = 10_000;

    private FinanceFeeConstant() {
    }

    /** 服务费 = 本金 × 5%，四舍五入到分。 */
    public static int feeOf(int baseCents) {
        return (baseCents * FEE_RATE_PERCENT + 50) / 100;
    }

    /** 利息 = 本金 × 0.05% × 期限天数，四舍五入到分。 */
    public static int interestOf(int principalCents, int termDays) {
        return roundDiv(principalCents * (long) DAILY_INTEREST_BPS * termDays, BPS_DENOMINATOR);
    }

    /** 罚息 = 本金 × 0.1% × 逾期天数，四舍五入到分。 */
    public static int penaltyOf(int principalCents, long overdueDays) {
        if (overdueDays <= 0) {
            return 0;
        }
        return roundDiv(principalCents * (long) DAILY_PENALTY_BPS * overdueDays, BPS_DENOMINATOR);
    }

    /** 已开始的逾期天数：到期时刻之后的任意一秒都算第 1 天。 */
    public static long overdueDaysOf(Instant dueAt, Instant now) {
        if (!now.isAfter(dueAt)) {
            return 0;
        }
        long seconds = Duration.between(dueAt, now).getSeconds();
        return seconds / SECONDS_PER_DAY + (seconds % SECONDS_PER_DAY == 0 ? 0 : 1);
    }

    private static int roundDiv(long numerator, long denominator) {
        return (int) ((numerator + denominator / 2) / denominator);
    }
}