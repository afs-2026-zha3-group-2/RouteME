package routeme.pojo;

import java.time.LocalDate;
import java.util.List;

/**
 * 推荐参照说明：当前查看行程的目的地、出发日期与当前用户兴趣。
 *
 * @param tripId      参照行程 id
 * @param destination 目的地展示名
 * @param startDate   出发日期
 * @param interests   当前用户兴趣
 */
public record RecommendationReference(
        long tripId,
        String destination,
        LocalDate startDate,
        List<String> interests) {

    /**
     * 从行程与当前用户兴趣构造参照说明。
     *
     * @param trip      参照行程
     * @param interests 当前用户兴趣
     * @return 参照说明
     */
    public static RecommendationReference of(TripPlan trip, List<String> interests) {
        return new RecommendationReference(
                trip.id(),
                trip.destination(),
                trip.startDate(),
                interests == null ? List.of() : List.copyOf(interests));
    }
}