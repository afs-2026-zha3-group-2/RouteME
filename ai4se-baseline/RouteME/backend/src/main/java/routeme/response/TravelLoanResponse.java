package routeme.response;

import java.time.Instant;

import routeme.pojo.TravelLoan;

/**
 * 借款的对外投影：金额全部为整数分；status 按读取时刻派生（active / repaid / overdue）。
 * penalty_cents 与 total_repay_cents 反映读取时刻的应计罚息，还款时按同一口径扣款。
 */
public record TravelLoanResponse(
        long id,
        long tripId,
        int principalCents,
        int serviceFeeCents,
        int disbursedCents,
        int interestCents,
        int repayCents,
        int penaltyCents,
        int totalRepayCents,
        int termDays,
        String status,
        Instant fundedAt,
        Instant dueAt,
        Instant repaidAt) {

    public static TravelLoanResponse from(TravelLoan loan, Instant now) {
        return new TravelLoanResponse(
                loan.id(),
                loan.tripId(),
                loan.principalCents(),
                loan.serviceFeeCents(),
                loan.disbursedCents(),
                loan.interestCents(),
                loan.repayCents(),
                loan.accruedPenaltyCents(now),
                loan.totalRepayCents(now),
                loan.termDays(),
                loan.wireStatus(now),
                loan.fundedAt(),
                loan.dueAt(),
                loan.repaidAt());
    }
}