package routeme.model;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;

import routeme.constant.TripTimeZoneConstant;
import routeme.enums.CreditExitMessageCode;
import routeme.enums.CreditExitPenaltyTier;
import routeme.enums.CreditExitReasonEnum;
import routeme.enums.CreditExitReviewStatus;
import routeme.pojo.CreditExitPreview;
import routeme.pojo.TripPlan;

/**
 * 纯计算器：出发基准、档位、月度序号与预计影响。不读写数据库。
 *
 * <p>区间左闭右开；月度边界按 Asia/Shanghai 解释；当前分数已到 0 时
 * 理论扣分仍计入月度事件，但实际变化为 0。</p>
 */
public final class CreditExitCalculator {

    public static final int RESTRICTION_THRESHOLD = 60;

    private CreditExitCalculator() {
    }

    public static Instant departureAt(TripPlan trip) {
        String meetingTime = trip.meetingTime();
        if (meetingTime != null && !meetingTime.isBlank()) {
            try {
                return LocalDateTime.parse(meetingTime.trim())
                        .atZone(TripTimeZoneConstant.ZONE)
                        .toInstant();
            } catch (DateTimeParseException ignored) {
                // 旧数据可能不是标准格式；回退到开始日期 00:00。
            }
        }
        return trip.plannedStart();
    }

    public static MonthWindow monthWindow(Instant at) {
        ZonedDateTime local = at.atZone(TripTimeZoneConstant.ZONE);
        Instant start = local.withDayOfMonth(1).toLocalDate()
                .atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();
        Instant end = start.atZone(TripTimeZoneConstant.ZONE).plusMonths(1).toInstant();
        return new MonthWindow(start, end);
    }

    /**
     * @param currentScore          当前信用分（0–100）
     * @param monthlyEffectiveCount 当月已生效的出发前退出扣分次数（不含本次）
     * @param now                   当前时刻
     */
    public static CreditExitPreview preview(
            TripPlan trip,
            CreditExitReasonEnum reason,
            int currentScore,
            int monthlyEffectiveCount,
            Instant now) {
        Instant departure = departureAt(trip);
        CreditExitPenaltyTier tier = CreditExitPenaltyTier.of(Duration.between(now, departure));

        if (reason.needsReview()) {
            return new CreditExitPreview(
                    reason, departure, tier, 0, 0, 0, false, false,
                    CreditExitReviewStatus.PENDING, currentScore, CreditExitMessageCode.PENDING_REVIEW);
        }

        if (tier == CreditExitPenaltyTier.GE7D) {
            return new CreditExitPreview(
                    reason, departure, tier, 0, 0, 0, false, false,
                    CreditExitReviewStatus.NOT_REQUIRED, currentScore, CreditExitMessageCode.NO_PENALTY);
        }

        if (tier == CreditExitPenaltyTier.DURING) {
            int applied = clamp(currentScore + tier.baseDelta()) - currentScore;
            CreditExitMessageCode code = applied == 0
                    ? CreditExitMessageCode.AT_FLOOR
                    : CreditExitMessageCode.DURING_TRIP;
            return new CreditExitPreview(
                    reason, departure, tier, tier.baseDelta(), applied, 0, false, false,
                    CreditExitReviewStatus.NOT_REQUIRED, currentScore + applied, code);
        }

        int ordinal = Math.max(0, monthlyEffectiveCount) + 1;
        boolean doubled = ordinal >= 2;
        int theoretical = tier.baseDelta() * (doubled ? 2 : 1);
        int applied = clamp(currentScore + theoretical) - currentScore;
        CreditExitMessageCode code;
        if (applied == 0 && theoretical < 0) {
            code = CreditExitMessageCode.AT_FLOOR;
        } else if (doubled) {
            code = CreditExitMessageCode.PENALTY_DOUBLED;
        } else {
            code = CreditExitMessageCode.PENALTY;
        }
        return new CreditExitPreview(
                reason, departure, tier, theoretical, applied, ordinal, doubled, true,
                CreditExitReviewStatus.NOT_REQUIRED, currentScore + applied, code);
    }

    public static int clamp(int score) {
        return Math.max(0, Math.min(100, score));
    }

    public record MonthWindow(Instant start, Instant end) {
    }
}
