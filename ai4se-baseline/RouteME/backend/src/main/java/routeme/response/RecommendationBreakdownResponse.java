package routeme.response;

import routeme.pojo.RecommendationBreakdown;

/**
 * 推荐分项响应：维度线值、可读标签与得分。
 *
 * @param dimension 维度线值
 * @param label     可读标签
 * @param points    得分
 */
public record RecommendationBreakdownResponse(String dimension, String label, int points) {

    public static RecommendationBreakdownResponse from(RecommendationBreakdown breakdown) {
        return new RecommendationBreakdownResponse(
                breakdown.dimension().wireValue(),
                breakdown.label(),
                breakdown.points());
    }
}