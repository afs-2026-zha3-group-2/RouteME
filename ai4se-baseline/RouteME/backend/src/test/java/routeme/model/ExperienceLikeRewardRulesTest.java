package routeme.model;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * 获赞结算的纯规则：档位推导边界与 Asia/Shanghai 月度窗口。
 */
class ExperienceLikeRewardRulesTest {

    @Test
    void in_likeCounts_out_tierBoundaries() {
        assertAll(
                () -> assertEquals(List.of(), ExperienceLikeRewardRules.reachedTiers(0)),
                () -> assertEquals(List.of(), ExperienceLikeRewardRules.reachedTiers(4)),
                () -> assertEquals(List.of(5), ExperienceLikeRewardRules.reachedTiers(5)),
                () -> assertEquals(List.of(5), ExperienceLikeRewardRules.reachedTiers(9)),
                () -> assertEquals(List.of(5, 10), ExperienceLikeRewardRules.reachedTiers(10)),
                () -> assertEquals(List.of(5, 10, 15, 20, 25), ExperienceLikeRewardRules.reachedTiers(25)),
                () -> assertEquals(List.of(5, 10, 15, 20, 25), ExperienceLikeRewardRules.reachedTiers(26)));
    }

    @Test
    void in_perExperienceCounts_out_maxInsteadOfSum() {
        assertAll(
                () -> assertEquals(0, ExperienceLikeRewardRules.maxLikes(null)),
                () -> assertEquals(0, ExperienceLikeRewardRules.maxLikes(List.of())),
                () -> assertEquals(7, ExperienceLikeRewardRules.maxLikes(List.of(3, 7))),
                () -> assertEquals(25, ExperienceLikeRewardRules.maxLikes(List.of(25, 4, 9))));
    }

    @Test
    void in_monthlyUsage_out_remainingDelta() {
        assertAll(
                () -> assertEquals(1, ExperienceLikeRewardRules.monthlyDelta(0)),
                () -> assertEquals(1, ExperienceLikeRewardRules.monthlyDelta(19)),
                () -> assertEquals(0, ExperienceLikeRewardRules.monthlyDelta(20)),
                () -> assertEquals(0, ExperienceLikeRewardRules.monthlyDelta(25)));
    }

    @Test
    void in_beijingMonthBoundary_out_windowSwitchesAtMidnight() {
        // 北京时间 2026-10-31 23:59:59 = UTC 2026-10-31T15:59:59Z（仍属十月）
        Instant lastSecondOfOctober = Instant.parse("2026-10-31T15:59:59Z");
        // 北京时间 2026-11-01 00:00:00 = UTC 2026-10-31T16:00:00Z（进入十一月）
        Instant firstSecondOfNovember = Instant.parse("2026-10-31T16:00:00Z");

        Instant octoberStart = ExperienceLikeRewardRules.monthStart(lastSecondOfOctober);
        Instant octoberEnd = ExperienceLikeRewardRules.monthEnd(lastSecondOfOctober);
        Instant novemberStart = ExperienceLikeRewardRules.monthStart(firstSecondOfNovember);
        Instant novemberEnd = ExperienceLikeRewardRules.monthEnd(firstSecondOfNovember);

        assertAll(
                () -> assertEquals(Instant.parse("2026-09-30T16:00:00Z"), octoberStart, "October starts at Beijing midnight"),
                () -> assertEquals(firstSecondOfNovember, octoberEnd, "October ends at Beijing November 1st"),
                () -> assertEquals(firstSecondOfNovember, novemberStart, "November starts at Beijing midnight"),
                () -> assertEquals(Instant.parse("2026-11-30T16:00:00Z"), novemberEnd, "November ends at Beijing December 1st"),
                () -> assertTrue(ExperienceLikeRewardRules.withinMonth(lastSecondOfOctober, octoberStart, octoberEnd)),
                () -> assertFalse(ExperienceLikeRewardRules.withinMonth(lastSecondOfOctober, novemberStart, novemberEnd)),
                () -> assertTrue(ExperienceLikeRewardRules.withinMonth(firstSecondOfNovember, novemberStart, novemberEnd)));
    }
}
