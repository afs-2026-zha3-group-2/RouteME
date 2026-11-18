package routeme.pojo;

import java.time.Instant;

import routeme.enums.CreditExitPenaltyTier;
import routeme.enums.CreditExitReasonEnum;
import routeme.enums.CreditExitReviewStatus;

/**
 * 一次退出同行事件：记录档位、月度序号、待核实状态与关联账本。
 */
public record CreditExitEvent(
        long id,
        long userId,
        long tripId,
        Long applicationId,
        CreditExitReasonEnum reason,
        Instant exitAt,
        Instant departureBasisAt,
        CreditExitPenaltyTier penaltyTier,
        int theoreticalDelta,
        int appliedDelta,
        int monthlyOrdinal,
        CreditExitReviewStatus reviewStatus,
        String exitNote,
        Instant reviewedAt,
        Long ledgerId,
        String idempotencyKey,
        Instant createdAt) {
}
