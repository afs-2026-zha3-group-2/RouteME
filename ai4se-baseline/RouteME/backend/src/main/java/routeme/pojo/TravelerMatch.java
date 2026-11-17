package routeme.pojo;

import static java.lang.Math.abs;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import routeme.enums.RecommendationDimensionEnum;

/**
 * 同行者匹配结果：唯一评分口径。
 *
 * <p>权重固定：目的地相同 +50；出发日期相同 +30；相差一天 +20；
 * 每个共同兴趣 +10 且共同兴趣合计不超过 +20；总分不超过 100。
 * 共同兴趣取「候选行程标签」与「当前用户兴趣」的交集。</p>
 *
 * @param score           匹配总分
 * @param breakdown       分项得分，求和等于 {@code score}
 * @param reasons         逐项原因，例如「目的地相同 +50」
 * @param sharedInterests 全部共同兴趣（不截断，供前端展示标签）
 */
public record TravelerMatch(
        int score,
        List<RecommendationBreakdown> breakdown,
        List<String> reasons,
        List<String> sharedInterests) {

    private static final int DESTINATION_POINTS = 50;
    private static final int SAME_DATE_POINTS = 30;
    private static final int ONE_DAY_APART_POINTS = 20;
    private static final int INTEREST_POINTS = 10;
    private static final int MAX_INTEREST_POINTS = 20;
    private static final int MAX_SCORE = 100;

    /**
     * 计算候选行程相对参照行程的匹配分。
     *
     * @param candidate  候选行程
     * @param reference  参照行程（当前查看的行程）
     * @param interests  当前用户兴趣
     * @return 匹配结果；无任何命中时总分为 0 且分项为空
     */
    public static TravelerMatch evaluate(TripPlan candidate, TripPlan reference, List<String> interests) {
        Objects.requireNonNull(candidate, "candidate");
        Objects.requireNonNull(reference, "reference");

        List<RecommendationBreakdown> breakdown = new ArrayList<>();
        if (reference.destinationCode() != null
                && !reference.destinationCode().isBlank()
                && reference.destinationCode().equals(candidate.destinationCode())) {
            breakdown.add(new RecommendationBreakdown(
                    RecommendationDimensionEnum.DESTINATION, "目的地相同", DESTINATION_POINTS));
        }
        if (reference.startDate() != null && candidate.startDate() != null) {
            long days = abs(ChronoUnit.DAYS.between(candidate.startDate(), reference.startDate()));
            if (days == 0) {
                breakdown.add(new RecommendationBreakdown(
                        RecommendationDimensionEnum.DATE, "出发日期相同", SAME_DATE_POINTS));
            } else if (days == 1) {
                breakdown.add(new RecommendationBreakdown(
                        RecommendationDimensionEnum.DATE, "旅行日期相差 1 天", ONE_DAY_APART_POINTS));
            }
        }

        List<String> viewerInterests = interests == null ? List.of() : interests;
        List<String> shared = candidate.tags().stream()
                .filter(viewerInterests::contains)
                .distinct()
                .toList();
        int counted = Math.min(shared.size(), MAX_INTEREST_POINTS / INTEREST_POINTS);
        for (int index = 0; index < counted; index += 1) {
            breakdown.add(new RecommendationBreakdown(
                    RecommendationDimensionEnum.INTEREST, "共同兴趣" + shared.get(index), INTEREST_POINTS));
        }

        int rawScore = breakdown.stream().mapToInt(RecommendationBreakdown::points).sum();
        List<String> reasons = breakdown.stream()
                .map(item -> item.label() + " +" + item.points())
                .toList();
        return new TravelerMatch(
                Math.min(rawScore, MAX_SCORE),
                List.copyOf(breakdown),
                reasons,
                List.copyOf(shared));
    }
}