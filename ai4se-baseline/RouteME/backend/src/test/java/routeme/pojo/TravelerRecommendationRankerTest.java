package routeme.pojo;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

class TravelerRecommendationRankerTest {

    private final TripPlan reference = trip(1, 3, "2026-11-20");

    @Test
    void in_zeroScoreCandidate_out_filtered() {
        // Given
        List<TravelerRecommendation> candidates = List.of(
                recommendation(10, 50, "2026-11-20"),
                recommendation(11, 90, "2026-11-20"),
                recommendation(12, 0, "2026-11-20"));

        // When
        List<TravelerRecommendation> ranked = TravelerRecommendationRanker.rank(reference, candidates);

        // Then
        assertAll(
                () -> assertEquals(2, ranked.size(), "zero score dropped"),
                () -> assertEquals(List.of(11L, 10L), ranked.stream().map(item -> item.user().id()).toList(), "score desc")
        );
    }

    @Test
    void in_sameScore_out_closerDateFirst() {
        // Given
        List<TravelerRecommendation> candidates = List.of(
                recommendation(20, 50, "2026-11-24"),
                recommendation(21, 50, "2026-11-21"));

        // When
        List<TravelerRecommendation> ranked = TravelerRecommendationRanker.rank(reference, candidates);

        // Then
        assertEquals(List.of(21L, 20L), ranked.stream().map(item -> item.user().id()).toList(), "closer date first");
    }

    @Test
    void in_multipleTripsOfSameUser_out_highestScoreOnly() {
        // Given
        List<TravelerRecommendation> candidates = List.of(
                recommendation(30, 50, "2026-11-20", 100),
                recommendation(30, 80, "2026-11-20", 101),
                recommendation(30, 60, "2026-11-20", 102));

        // When
        List<TravelerRecommendation> ranked = TravelerRecommendationRanker.rank(reference, candidates);

        // Then
        assertAll(
                () -> assertEquals(1, ranked.size(), "one item per user"),
                () -> assertEquals(80, ranked.get(0).match().score(), "highest score kept"),
                () -> assertEquals(101, ranked.get(0).trip().id(), "highest scoring trip kept")
        );
    }

    @Test
    void in_sameUserSameScore_out_closerTripFirst() {
        // Given
        List<TravelerRecommendation> candidates = List.of(
                recommendation(40, 50, "2026-11-25", 200),
                recommendation(40, 50, "2026-11-21", 201));

        // When
        List<TravelerRecommendation> ranked = TravelerRecommendationRanker.rank(reference, candidates);

        // Then
        assertAll(
                () -> assertEquals(1, ranked.size(), "one item per user"),
                () -> assertEquals(201, ranked.get(0).trip().id(), "trip with closer date kept")
        );
    }

    @Test
    void in_emptyCandidates_out_emptyList() {
        assertTrue(TravelerRecommendationRanker.rank(reference, List.of()).isEmpty(), "empty in, empty out");
    }

    private TravelerRecommendation recommendation(long userId, int score, String startDate) {
        return recommendation(userId, score, startDate, userId * 10);
    }

    private TravelerRecommendation recommendation(long userId, int score, String startDate, long tripId) {
        TripPlan trip = trip(tripId, userId, startDate);
        TravelerMatch match = new TravelerMatch(score, List.of(), List.of(), List.of());
        return new TravelerRecommendation(user(userId), trip, match);
    }

    private DemoUser user(long id) {
        return new DemoUser(id, "用户" + id, "用", null, null, null, null, null, "", List.of(), true, "user", "active");
    }

    private TripPlan trip(long id, long publisherId, String startDate) {
        LocalDate date = LocalDate.parse(startDate);
        return new TripPlan(
                id, publisherId, "行程" + id, "440100", "广州", date, date,
                List.of("集合", "终点"), List.of(), null, null, null, null, null, List.of(), 4, 1, null,
                Instant.parse("2026-11-01T10:00:00Z"), Instant.parse("2026-11-01T10:00:00Z"),
                null, null, null);
    }
}