package routeme.pojo;

import routeme.enums.RecommendationDimensionEnum;

/**
 * 推荐分项：一个命中维度对应的可读标签与得分。
 * 分项得分之和必须等于推荐总分。
 *
 * @param dimension 维度：目的地 / 日期 / 共同兴趣
 * @param label     可读标签，例如「目的地相同」「共同兴趣摄影」
 * @param points    该维度得分
 */
public record RecommendationBreakdown(
        RecommendationDimensionEnum dimension,
        String label,
        int points) {
}