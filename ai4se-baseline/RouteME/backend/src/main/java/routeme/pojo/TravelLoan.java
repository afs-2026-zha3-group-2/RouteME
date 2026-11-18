package routeme.pojo;

import java.time.Instant;

import routeme.enums.LoanStatusEnum;

/**
 * 借款视图：落库状态只有 ACTIVE / REPAID，OVERDUE 由读取时刻对 due_at 派生。
 */
public record TravelLoan(
        long id,
        long userId,
        long tripId,
        int principalCents,
        int serviceFeeCents,
        int disbursedCents,
        int repayCents,
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
}