package routeme.response;

import java.time.Instant;
import java.util.List;

import routeme.pojo.TravelerRecommendation;

/**
 * 单条同行者推荐响应。
 *
 * @param user              候选用户公开摘要
 * @param trip              关联行程
 * @param score             匹配总分
 * @param reasons           逐项原因，例如「目的地相同 +50」
 * @param breakdown         分项得分
 * @param sharedInterests   全部共同兴趣
 */
public record TravelerRecommendationResponse(
        DemoUserResponse user,
        TripSummaryResponse trip,
        int score,
        List<String> reasons,
        List<RecommendationBreakdownResponse> breakdown,
        List<String> sharedInterests) {

    public static TravelerRecommendationResponse from(TravelerRecommendation recommendation, Instant now) {
        return new TravelerRecommendationResponse(
                DemoUserResponse.from(recommendation.user()),
                TripSummaryResponse.from(recommendation.trip(), recommendation.user(), now),
                recommendation.match().score(),
                recommendation.match().reasons(),
                recommendation.match().breakdown().stream()
                        .map(RecommendationBreakdownResponse::from)
                        .toList(),
                recommendation.match().sharedInterests());
    }
}