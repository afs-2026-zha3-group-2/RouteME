package routeme.pojo;

import java.time.Instant;

import routeme.enums.CreditExitMessageCode;
import routeme.enums.CreditExitPenaltyTier;
import routeme.enums.CreditExitReasonEnum;
import routeme.enums.CreditExitReviewStatus;

/**
 * 退出前的信用影响预览；由服务端计算，前端只展示。
 */
public record CreditExitPreview(
        CreditExitReasonEnum reason,
        Instant departureAt,
        CreditExitPenaltyTier penaltyTier,
        int theoreticalDelta,
        int appliedDelta,
        int monthlyOrdinal,
        boolean monthlyDoubled,
        boolean counted,
        CreditExitReviewStatus reviewStatus,
        int resultingScore,
        CreditExitMessageCode messageCode) {
}
