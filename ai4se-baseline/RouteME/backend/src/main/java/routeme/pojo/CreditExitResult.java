package routeme.pojo;

import routeme.enums.CreditExitMessageCode;
import routeme.enums.CreditExitReviewStatus;

/**
 * 退出后的实际信用结果；与预览同口径，以服务端重新计算为准。
 */
public record CreditExitResult(
        int creditScore,
        String creditLevel,
        boolean creditRestricted,
        int theoreticalDelta,
        int appliedDelta,
        int monthlyOrdinal,
        CreditExitReviewStatus reviewStatus,
        CreditExitMessageCode messageCode) {

    public static CreditExitResult from(CreditExitPreview preview, UserCredit credit) {
        return new CreditExitResult(
                credit.score(),
                credit.levelCode(),
                credit.score() < 60,
                preview.theoreticalDelta(),
                preview.appliedDelta(),
                preview.monthlyOrdinal(),
                preview.reviewStatus(),
                preview.messageCode());
    }
}
