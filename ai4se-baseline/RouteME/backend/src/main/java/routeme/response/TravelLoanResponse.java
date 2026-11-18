package routeme.response;

import java.time.Instant;

import routeme.pojo.TravelLoan;

/**
 * 借款响应：状态由落库状态与到期时刻派生（active / repaid / overdue）。
 */
public record TravelLoanResponse(
        long id,
        long tripId,
        int principalCents,
        int serviceFeeCents,
        int disbursedCents,
        int repayCents,
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
                loan.repayCents(),
                loan.termDays(),
                loan.wireStatus(now),
                loan.fundedAt(),
                loan.dueAt(),
                loan.repaidAt());
    }
}