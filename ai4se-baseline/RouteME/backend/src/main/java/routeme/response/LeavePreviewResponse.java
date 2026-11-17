package routeme.response;

import java.time.Instant;

import routeme.pojo.CreditExitPreview;

/**
 * 退出预览响应：前端只展示，不重复计算扣分。
 */
public record LeavePreviewResponse(
        String reason,
        Instant departureAt,
        String penaltyTier,
        int theoreticalDelta,
        int appliedDelta,
        int monthlyOrdinal,
        boolean monthlyDoubled,
        boolean counted,
        String reviewStatus,
        int resultingScore,
        String messageCode) {

    public static LeavePreviewResponse from(CreditExitPreview preview) {
        return new LeavePreviewResponse(
                preview.reason().wireValue(),
                preview.departureAt(),
                preview.penaltyTier().wireValue(),
                preview.theoreticalDelta(),
                preview.appliedDelta(),
                preview.monthlyOrdinal(),
                preview.monthlyDoubled(),
                preview.counted(),
                preview.reviewStatus().wireValue(),
                preview.resultingScore(),
                preview.messageCode().wireValue());
    }
}
