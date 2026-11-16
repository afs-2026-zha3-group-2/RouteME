package routeme.pojo;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

class TripMatchTest {

    private final TripPlan reference = trip(1, "珠海情侣路日落机位二刷", "珠海", "2026-11-16", List.of("摄影", "海边"));
    private final TripPlan candidate = trip(2, "广州老城骑楼扫街半日", "广州", "2026-11-16", List.of("摄影", "历史"));

    @Test
    void in_noOverlap_out_fallbackReasonAndInterestBasis() {
        // When
        TripMatch match = TripMatch.of(
                trip(3, "深圳徒步", "深圳", "2026-12-01", List.of("徒步")),
                null, null, null, List.of("摄影"));

        // Then
        assertAll(
                () -> assertEquals(0, match.score(), "score"),
                () -> assertEquals("暂无重合，可作为新方向的灵感", match.reasons().get(0), "fallback reason"),
                () -> assertEquals("对照你的旅行兴趣", match.basis(), "basis")
        );
    }

    @Test
    void in_sameDestinationAndDateWithSharedInterests_out_cappedAt100() {
            // Given
            TripPlan sameDestinationReference =
                    trip(9, "广州骑楼参考", "广州", "2026-11-16", List.of("摄影", "海边"));

            // When
            TripMatch match = TripMatch.of(candidate, sameDestinationReference, null, null, List.of("摄影", "历史"));

            // Then
            assertAll(
                    () -> assertEquals(100, match.score(), "50 + 30 + 20 (capped)"),
                    () -> assertTrue(match.reasons().contains("目的地相同"), "destination reason"),
                    () -> assertTrue(match.reasons().contains("出发日期相同"), "date reason"),
                    () -> assertTrue(match.reasons().contains("都喜欢摄影、历史"), "shared interests"),
                    () -> assertTrue(match.basis().contains("广州骑楼参考"), "reference basis")
            );
        }

    @Test
    void in_oneDayApart_out_twentyPoints() {
        // When
        TripMatch match = TripMatch.of(
                trip(4, "相差一天", "深圳", "2026-11-17", List.of("徒步")),
                null, null, LocalDate.parse("2026-11-16"), List.of());

        // Then
        assertAll(
                () -> assertEquals(20, match.score(), "one-day difference"),
                () -> assertTrue(match.reasons().contains("出发日期相差一天"), "reason")
        );
    }

    @Test
        void in_sameDateOnly_out_thirtyPoints() {
            // When
            TripMatch match = TripMatch.of(candidate, null, null, LocalDate.parse("2026-11-16"), List.of());

            // Then
            assertAll(
                    () -> assertEquals(30, match.score(), "same start date"),
                    () -> assertTrue(match.reasons().contains("出发日期相同"), "date reason")
            );
        }

        @Test
        void in_singleSharedInterest_out_tenPoints() {
            // When
            TripMatch match = TripMatch.of(candidate, null, null, null, List.of("摄影"));

            // Then
            assertAll(
                    () -> assertEquals(10, match.score(), "one shared interest"),
                    () -> assertTrue(match.reasons().contains("都喜欢摄影"), "interest reason")
            );
        }

        @Test
        void in_threeSharedInterests_out_cappedAtTwenty() {
        // When
        TripMatch match = TripMatch.of(
                trip(5, "兴趣", "佛山", "2026-11-20", List.of("摄影", "美食", "历史")),
                null, null, null, List.of("摄影", "美食", "历史"));

        // Then
        assertEquals(20, match.score(), "interest bonus capped at 20");
    }

    @Test
    void in_filterDestination_out_overridesReference() {
            // Given
            TripPlan otherReference = trip(8, "珠海参考", "珠海", "2026-11-20", List.of());

            // When
            TripMatch match = TripMatch.of(candidate, otherReference, "440100", null, List.of());

            // Then
            assertAll(
                    () -> assertEquals(50, match.score(), "filter destination wins"),
                    () -> assertTrue(match.reasons().contains("目的地相同"), "destination reason")
            );
        }

    private TripPlan trip(long id, String title, String destination, String startDate, List<String> tags) {
        String code = switch (destination) {
            case "珠海" -> "440400";
            case "广州" -> "440100";
            default -> destination;
        };
        String name = switch (destination) {
            case "珠海" -> "珠海市";
            case "广州" -> "广州市";
            default -> destination;
        };
        return new TripPlan(
                id, 1, title, code, name, LocalDate.parse(startDate), LocalDate.parse(startDate),
                List.of("集合", "终点"), null, null, null, null, null, tags, 4, 1, null,
                Instant.parse("2026-11-01T10:00:00Z"), Instant.parse("2026-11-01T10:00:00Z"));
    }
}