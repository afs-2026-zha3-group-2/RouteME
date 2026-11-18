package routeme.pojo;

import java.time.Instant;

import routeme.constant.FinanceFeeConstant;
import routeme.enums.LoanStatusEnum;

/**
 * 借款视图：落库状态只有 ACTIVE / REPAID，OVERDUE 由读取时刻对 due_at 派生。
 * 应还金额 = 本金 + 利息；罚息只在逾期后按已开始天数累计，还款时一并结清。
 */
public record TravelLoan(
        long id,
        long userId,
        long tripId,
        int principalCents,
        int serviceFeeCents,
        int disbursedCents,
        int interestCents,
        int repayCents,
        int penaltyCents,
        int termDays,
        LoanStatusEnum storedStatus,
        Instant fundedAt,
        Instant dueAt,
        Instant repaidAt) {

    /** 读取时派生：已还清优先；仍 ACTIVE 且晚于到期时刻则视为逾期。 */
    public LoanStatusEnum status(Instant now) {
        if (storedStatus == LoanStatusEnum.REPAID) {
            return LoanStatusEnum.REPAID;
        }
        return now.isAfter(dueAt) ? LoanStatusEnum.OVERDUE : LoanStatusEnum.ACTIVE;
    }

    public String wireStatus(Instant now) {
        return status(now).wireValue();
    }

    /** 当前应计的逾期罚息：已还清返回落库的实收罚息，进行中按读取时刻实时累计。 */
    public int accruedPenaltyCents(Instant now) {
        if (storedStatus == LoanStatusEnum.REPAID) {
            return penaltyCents;
        }
        return FinanceFeeConstant.penaltyOf(
                principalCents, FinanceFeeConstant.overdueDaysOf(dueAt, now));
    }

    /** 还款合计 = 应还（本金 + 利息）+ 当前应计罚息。 */
    public int totalRepayCents(Instant now) {
        return repayCents + accruedPenaltyCents(now);
    }
}