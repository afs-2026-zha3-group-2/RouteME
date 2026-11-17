package routeme.pojo;

import static java.lang.Math.abs;

import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 推荐排序与去重的纯函数：
 * 丢弃 0 分候选；同一发布者只保留匹配分最高的行程
 * （同分按出发日期更接近参照行程、再按行程 id）；
 * 最终按总分倒序、日期差升序、行程 id 升序排列。
 */
public final class TravelerRecommendationRanker {

    private TravelerRecommendationRanker() {
    }

    /**
     * 过滤、去重并排序推荐项。
     *
     * @param reference  参照行程，用于计算日期接近度
     * @param candidates 未去重的推荐项
     * @return 稳定排序后的推荐项；同一用户最多一条
     */
    public static List<TravelerRecommendation> rank(
            TripPlan reference,
            List<TravelerRecommendation> candidates) {
        Map<Long, TravelerRecommendation> bestByUser = new LinkedHashMap<>();
        for (TravelerRecommendation candidate : candidates) {
            if (candidate.match().score() <= 0) {
                continue;
            }
            bestByUser.merge(
                    candidate.user().id(),
                    candidate,
                    (current, incoming) -> preferred(reference, current, incoming));
        }
        return bestByUser.values().stream()
                .sorted(ordering(reference))
                .toList();
    }

    /**
     * 同分按日期差再按行程 id 取更优者。
     */
    private static TravelerRecommendation preferred(
            TripPlan reference,
            TravelerRecommendation left,
            TravelerRecommendation right) {
        return ordering(reference).compare(left, right) <= 0 ? left : right;
    }

    private static Comparator<TravelerRecommendation> ordering(TripPlan reference) {
        return Comparator
                .comparingInt((TravelerRecommendation item) -> item.match().score())
                .reversed()
                .thenComparingLong(item -> dateDistance(reference, item.trip()))
                .thenComparingLong(item -> item.trip().id());
    }

    private static long dateDistance(TripPlan reference, TripPlan candidate) {
        if (reference.startDate() == null || candidate.startDate() == null) {
            return Long.MAX_VALUE;
        }
        return abs(ChronoUnit.DAYS.between(candidate.startDate(), reference.startDate()));
    }
}