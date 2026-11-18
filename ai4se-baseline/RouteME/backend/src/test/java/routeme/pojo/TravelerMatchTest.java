package routeme.pojo;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import routeme.enums.RecommendationDimensionEnum;

class TravelerMatchTest {

    private final TripPlan reference = trip(1, 3, "广州老城一日", "440100", "2026-11-20", List.of("摄影", "美食", "历史"));
    private final TripPlan candidate = trip(2, 2, "广州骑楼", "440100", "2026-11-20", List.of("摄影", "历史"));

    @Test
    void in_noOverlap_out_zeroScoreAndEmptyBreakdown() {
        // When
        TravelerMatch match = TravelerMatch.evaluate(
                trip(3, 4, "上海咖啡", "310000", "2026-11-28", List.of("咖啡")),
                reference,
                List.of("摄影"));

        // Then
        assertAll(
                () -> assertEquals(0, match.score(), "score"),
                () -> assertTrue(match.breakdown().isEmpty(), "no breakdown"),
                () -> assertTrue(match.reasons().isEmpty(), "no reasons"),
                () -> assertTrue(match.sharedInterests().isEmpty(), "no shared interests")
        );
    }

    @Test
    void in_sameDestination_out_fiftyPoints() {
        // When
        TravelerMatch match = TravelerMatch.evaluate(
                trip(4, 2, "广州其他日期", "440100", "2026-11-25", List.of("徒步")),
                reference,
                List.of());

        // Then
        assertAll(
                () -> assertEquals(50, match.score(), "destination only"),
                () -> assertEquals(1, match.breakdown().size(), "single item"),
                () -> assertEquals(RecommendationDimensionEnum.DESTINATION, match.breakdown().get(0).dimension(), "dimension"),
                () -> assertEquals("目的地相同", match.breakdown().get(0).label(), "label"),
                () -> assertEquals(50, match.breakdown().get(0).points(), "points"),
                () -> assertEquals("目的地相同 +50", match.reasons().get(0), "reason text")
        );
    }

    @Test
    void in_sameDate_out_thirtyPoints() {
        // When
        TravelerMatch match = TravelerMatch.evaluate(
                trip(5, 2, "佛山同日", "440600", "2026-11-20", List.of("徒步")),
                reference,
                List.of());

        // Then
        assertAll(
                () -> assertEquals(30, match.score(), "same date"),
                () -> assertEquals("出发日期相同 +30", match.reasons().get(0), "reason text")
        );
    }

    @Test
    void in_oneDayApart_out_twentyPoints() {
        // When
        TravelerMatch match = TravelerMatch.evaluate(
                trip(6, 2, "差一天", "440600", "2026-11-21", List.of()),
                reference,
                List.of());

        // Then
        assertAll(
                () -> assertEquals(20, match.score(), "one day apart"),
                () -> assertEquals("旅行日期相差 1 天 +20", match.reasons().get(0), "reason text")
        );
    }

    @Test
    void in_oneSharedInterest_out_tenPoints() {
        // When
        TravelerMatch match = TravelerMatch.evaluate(
                trip(7, 2, "兴趣", "440600", "2026-12-01", List.of("摄影")),
                reference,
                List.of("摄影", "美食"));

        // Then
        assertAll(
                () -> assertEquals(10, match.score(), "one interest"),
                () -> assertEquals("共同兴趣摄影 +10", match.reasons().get(0), "reason text"),
                () -> assertEquals(List.of("摄影"), match.sharedInterests(), "shared"),
                () -> assertEquals(RecommendationDimensionEnum.INTEREST, match.breakdown().get(0).dimension(), "dimension")
        );
    }

    @Test
    void in_threeSharedInterests_out_cappedAtTwenty() {
        // When
        TravelerMatch match = TravelerMatch.evaluate(
                trip(8, 2, "兴趣", "440600", "2026-12-01", List.of("摄影", "美食", "历史")),
                reference,
                List.of("摄影", "美食", "历史"));

        // Then
        assertAll(
                () -> assertEquals(20, match.score(), "interest capped at 20"),
                () -> assertEquals(3, match.sharedInterests().size(), "all shared interests returned"),
                () -> assertEquals(
                        2,
                        match.breakdown().stream()
                                .filter(item -> item.dimension() == RecommendationDimensionEnum.INTEREST)
                                .count(),
                        "only two interests counted"),
                () -> assertTrue(match.reasons().contains("共同兴趣摄影 +10"), "first interest"),
                () -> assertTrue(match.reasons().contains("共同兴趣美食 +10"), "second interest"),
                () -> assertFalse(match.reasons().contains("共同兴趣历史 +10"), "third interest not counted")
        );
    }

    @Test
    void in_allDimensionsOut_scoreEqualsBreakdownSumAndCappedAtHundred() {
        // When
        TravelerMatch match = TravelerMatch.evaluate(candidate, reference, List.of("摄影", "历史"));

        // Then
        assertAll(
                () -> assertEquals(100, match.score(), "50 + 30 + 20"),
                () -> assertEquals(100, match.breakdown().stream().mapToInt(RecommendationBreakdown::points).sum(), "sum"),
                () -> assertEquals(4, match.breakdown().size(), "destination + date + two interests"),
                () -> assertEquals(4, match.reasons().size(), "one reason per item")
        );
    }

    private TripPlan trip(long id, long publisherId, String title, String code, String startDate, List<String> tags) {
        LocalDate date = LocalDate.parse(startDate);
        return new TripPlan(
                id, publisherId, title, code, code, date, date,
                List.of("集合", "终点"), List.of(), null, null, null, null, null, tags, 4, 1, null,
                Instant.parse("2026-11-01T10:00:00Z"), Instant.parse("2026-11-01T10:00:00Z"),
                null, null, null, null);
    }
}