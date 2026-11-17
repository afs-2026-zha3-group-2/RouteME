package routeme.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import routeme.constant.ExperienceLikeConstant;
import routeme.constant.TripTimeZoneConstant;

/**
 * 体验获赞的信用结算纯规则：档位推导、单篇取最大与 Asia/Shanghai 月度窗口。
 *
 * <p>不含 IO；结算编排在 {@code ExperienceLikeRewardServiceImpl}。</p>
 */
public final class ExperienceLikeRewardRules {

    private ExperienceLikeRewardRules() {
    }

    /**
     * 多篇体验取单篇最高赞数；无体验或全无赞时为 0。
     */
    public static int maxLikes(List<Integer> likeCountsPerExperience) {
        if (likeCountsPerExperience == null || likeCountsPerExperience.isEmpty()) {
            return 0;
        }
        return likeCountsPerExperience.stream().max(Integer::compareTo).orElse(0);
    }

    /**
     * 赞数已跨过的档位，按升序返回。
     */
    public static List<Integer> reachedTiers(int maxLikes) {
        return ExperienceLikeConstant.TIERS.stream()
                .filter(tier -> maxLikes >= tier)
                .toList();
    }

    /**
     * 本月仍可发放的单档分值：月度额度不足时实发 0（仍留痕并锁定档位）。
     */
    public static int monthlyDelta(int monthlyUsed) {
        return ExperienceLikeConstant.MONTHLY_LIMIT - monthlyUsed >= 1
                ? ExperienceLikeConstant.PER_TIER_DELTA
                : 0;
    }

    /**
     * 北京时间当月月首对应的 UTC 瞬时（左闭）。
     */
    public static Instant monthStart(Instant now) {
        return firstDayOfMonth(now).atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();
    }

    /**
     * 北京时间下月月首对应的 UTC 瞬时（右开）。
     */
    public static Instant monthEnd(Instant now) {
        return firstDayOfMonth(now).plusMonths(1).atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();
    }

    /**
     * 判断账本发生时间是否落在给定区间 [start, end) 内。
     */
    public static boolean withinMonth(Instant occurredAt, Instant monthStart, Instant monthEnd) {
        return !occurredAt.isBefore(monthStart) && occurredAt.isBefore(monthEnd);
    }

    private static LocalDate firstDayOfMonth(Instant now) {
        return LocalDate.ofInstant(now, TripTimeZoneConstant.ZONE).withDayOfMonth(1);
    }
}
