package routeme.pojo;

import java.util.List;

/**
 * 推荐结果：参照说明与已去重、已排序的推荐项。
 *
 * @param reference 参照说明
 * @param items     推荐项；没有候选时为空列表
 */
public record RecommendationResult(
        RecommendationReference reference,
        List<TravelerRecommendation> items) {
}