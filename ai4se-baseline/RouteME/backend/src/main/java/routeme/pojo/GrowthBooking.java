package routeme.pojo;

import routeme.constant.GrowthConstant;

/**
 * 一次经验变化请求：理论变化量由调用方给出，实际生效量由记账服务按上限 / 最低 0 裁断。
 * {@code idempotencyKey} 为空表示不做幂等约束（例如测试夹具）。
 */
public record GrowthBooking(
        long userId,
        String reasonCode,
        int nominalDelta,
        String relatedType,
        String relatedId,
        String idempotencyKey) {

    public static GrowthBooking publish(long userId, long tripId, int publishExp) {
        return new GrowthBooking(
                userId,
                GrowthConstant.REASON_PUBLISH,
                publishExp,
                GrowthConstant.RELATED_TRIP,
                String.valueOf(tripId),
                GrowthConstant.publishKey(tripId, userId));
    }

    public static GrowthBooking like(long userId, long experienceId, int tier) {
        return new GrowthBooking(
                userId,
                GrowthConstant.REASON_LIKE,
                GrowthConstant.LIKE_TIER_DELTA,
                GrowthConstant.RELATED_EXPERIENCE,
                String.valueOf(experienceId),
                GrowthConstant.likeKey(experienceId, tier));
    }

    public static GrowthBooking report(long userId, long reportId) {
        return new GrowthBooking(
                userId,
                GrowthConstant.REASON_REPORT,
                -GrowthConstant.REPORT_PENALTY,
                GrowthConstant.RELATED_REPORT,
                String.valueOf(reportId),
                GrowthConstant.reportKey(reportId));
    }
}
