package routeme.response;

import java.time.LocalDate;
import java.util.List;

import routeme.pojo.RecommendationReference;

/**
 * 推荐参照响应。
 *
 * @param tripId      参照行程 id
 * @param destination 目的地展示名
 * @param startDate   出发日期
 * @param interests   当前用户兴趣
 */
public record RecommendationReferenceResponse(
        long tripId,
        String destination,
        LocalDate startDate,
        List<String> interests) {

    public static RecommendationReferenceResponse from(RecommendationReference reference) {
        return new RecommendationReferenceResponse(
                reference.tripId(),
                reference.destination(),
                reference.startDate(),
                reference.interests());
    }
}