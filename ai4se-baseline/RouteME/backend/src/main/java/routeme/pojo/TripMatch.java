package routeme.pojo;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * 匹配结果：目的地 50 / 出发日期相同 30 / 相差一天 20 / 共同兴趣每项 10（合计 ≤20），
 * 总分上限 100；理由必须写明命中的维度。
 *
 * <p>只与个人参照比较（最近一条未结束的已发布行程，或我的兴趣）；首页筛选不参与打分。</p>
 */
public record TripMatch(int score, int percentage, List<String> reasons, String basis) {

    public static TripMatch of(
            TripPlan candidate,
            TripPlan reference,
            List<String> interests) {
        String destinationCode = reference == null ? "" : reference.destinationCode();
        LocalDate date = reference == null ? null : reference.startDate();

        int score = 0;
        List<String> reasons = new ArrayList<>();
        if (!destinationCode.isEmpty() && destinationCode.equals(candidate.destinationCode())) {
            score += 50;
            reasons.add("目的地相同");
        }
        if (date != null) {
            long days = Math.abs(ChronoUnit.DAYS.between(candidate.startDate(), date));
            if (days == 0) {
                score += 30;
                reasons.add("出发日期相同");
            } else if (days == 1) {
                score += 20;
                reasons.add("出发日期相差一天");
            }
        }
        List<String> shared = candidate.tags().stream()
                .filter(interests::contains)
                .distinct()
                .toList();
        if (!shared.isEmpty()) {
            score += Math.min(shared.size() * 10, 20);
            reasons.add("都喜欢" + String.join("、", shared));
        }
        if (reasons.isEmpty()) {
            reasons.add("暂无重合，可作为新方向的灵感");
        }
        String basis = reference != null
                ? "对照你发布的《" + reference.title() + "》"
                : "对照你的旅行兴趣";
        int capped = Math.min(score, 100);
        return new TripMatch(capped, capped, List.copyOf(reasons), basis);
    }
}