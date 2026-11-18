package routeme.constant;

import java.util.List;

/**
 * 用户成长等级口径（REQ-031）：每 100 EXP 一级、单篇每 10 个有效赞 +5、
 * 正向每日上限 20、举报成立 −50；与信用分账本完全分离。
 */
public final class GrowthConstant {

    public static final String REASON_PUBLISH = "EXPERIENCE_PUBLISH";
    public static final String REASON_LIKE = "EXPERIENCE_LIKE";
    public static final String REASON_REPORT = "REPORT_VIOLATION";

    public static final List<String> POSITIVE_REASONS = List.of(REASON_PUBLISH, REASON_LIKE);

    public static final String RELATED_TRIP = "TRIP";
    public static final String RELATED_EXPERIENCE = "EXPERIENCE";
    public static final String RELATED_REPORT = "REPORT";

    public static final int LIKE_TIER_SIZE = 10;
    public static final int LIKE_TIER_DELTA = 5;
    public static final int REPORT_PENALTY = 50;
    public static final int DAILY_POSITIVE_LIMIT = 20;

    private GrowthConstant() {
    }

    /**
     * 同一（行程, 作者）只发放一次发布经验；编辑、重复提交与删除重建共用该键。
     */
    public static String publishKey(long tripId, long authorId) {
        return "GROWTH_PUBLISH:" + tripId + ":" + authorId;
    }

    /**
     * 同一篇体验同一档位只结算一次；取消点赞不回滚，也不重复结算。
     */
    public static String likeKey(long experienceId, int tier) {
        return "GROWTH_LIKE:" + experienceId + ":" + tier;
    }

    /**
     * 同一份举报只扣减一次。
     */
    public static String reportKey(long reportId) {
        return "GROWTH_REPORT:" + reportId;
    }

    /**
     * 有效赞数跨过的最高档位；不足 10 时为 0。
     */
    public static int likeTier(int effectiveLikes) {
        return effectiveLikes / LIKE_TIER_SIZE * LIKE_TIER_SIZE;
    }
}
