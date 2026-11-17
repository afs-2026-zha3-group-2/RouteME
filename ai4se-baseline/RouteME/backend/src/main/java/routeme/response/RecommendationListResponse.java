package routeme.response;

import java.time.Instant;
import java.util.List;

import routeme.pojo.RecommendationResult;

/**
 * 推荐列表响应：参照说明与推荐项。
 *
 * @param reference 参照说明
 * @param items     推荐项；没有候选时为空数组
 */
public record RecommendationListResponse(
        RecommendationReferenceResponse reference,
        List<TravelerRecommendationResponse> items) {

    public static RecommendationListResponse from(RecommendationResult result, Instant now) {
        return new RecommendationListResponse(
                RecommendationReferenceResponse.from(result.reference()),
                result.items().stream()
                        .map(item -> TravelerRecommendationResponse.from(item, now))
                        .toList());
    }
}