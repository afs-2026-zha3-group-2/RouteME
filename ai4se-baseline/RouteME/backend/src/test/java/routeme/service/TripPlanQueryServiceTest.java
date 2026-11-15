package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import routeme.request.TripQuery;
import routeme.model.TripPlan;

class TripPlanQueryServiceTest {

    private final TripPlanQueryService service = new TripPlanQueryService();

    private final List<TripPlan> trips = List.of(
            trip(1, 1, "珠海情侣路日落机位二刷", "珠海", "2026-11-16", "2026-11-16",
                    List.of("摄影", "海边"), "2026-11-13T22:05:00Z"),
            trip(2, 2, "广州老城骑楼扫街半日", "广州", "2026-11-16", "2026-11-16",
                    List.of("摄影", "历史"), "2026-11-11T12:30:00Z"),
            trip(3, 2, "深圳大鹏半岛海岸线徒步", "深圳", "2026-11-23", "2026-11-24",
                    List.of("徒步", "海边"), "2026-11-14T20:15:00Z"));

    @Test
    void in_keyword_out_matchingTrips() {
        // When
        List<TripPlan> byTitle = service.search(trips, query("珠海", null, null, null, Set.of()), this::nickname);
        List<TripPlan> byStop = service.search(trips, query("深圳集合", null, null, null, Set.of()), this::nickname);
        List<TripPlan> byPublisher = service.search(trips, query("陈屿", null, null, null, Set.of()), this::nickname);

        // Then
        assertAll(
                () -> assertEquals(List.of(1L), ids(byTitle), "title match"),
                () -> assertEquals(List.of(3L), ids(byStop), "stop match"),
                () -> assertEquals(List.of(2L, 3L), ids(byPublisher), "publisher match"),
                () -> assertEquals(3, service.search(trips, TripQuery.empty(), this::nickname).size(), "empty query")
        );
    }

    @Test
    void in_destinationOrDateRange_out_filteredTrips() {
        // When
        List<TripPlan> byDestination = service.search(
                trips, query("", "广州", null, null, Set.of()), this::nickname);
        List<TripPlan> byDateFrom = service.search(
                trips, query("", null, LocalDate.parse("2026-11-20"), null, Set.of()), this::nickname);
        List<TripPlan> byDateTo = service.search(
                trips, query("", null, null, LocalDate.parse("2026-11-16"), Set.of()), this::nickname);
        List<TripPlan> byOverlap = service.search(
                trips, query("", null, LocalDate.parse("2026-11-23"), LocalDate.parse("2026-11-23"), Set.of()),
                this::nickname);

        // Then
        assertAll(
                () -> assertEquals(List.of(2L), ids(byDestination), "destination exact match"),
                () -> assertEquals(List.of(3L), ids(byDateFrom), "date_from keeps later trips"),
                () -> assertEquals(List.of(1L, 2L), ids(byDateTo), "date_to keeps earlier trips"),
                () -> assertEquals(List.of(3L), ids(byOverlap), "range intersection")
        );
    }

    @Test
    void in_tagsOut_matchesAnyTag() {
        // When
        List<TripPlan> byPhotography = service.search(
                trips, query("", null, null, null, Set.of("摄影")), this::nickname);
        List<TripPlan> byTwoTags = service.search(
                trips, query("", null, null, null, Set.of("历史", "徒步")), this::nickname);

        // Then
        assertAll(
                () -> assertEquals(List.of(1L, 2L), ids(byPhotography), "single tag"),
                () -> assertEquals(List.of(2L, 3L), ids(byTwoTags), "any tag matches")
        );
    }

    @Test
    void in_sort_out_expectedOrder() {
        // When
        List<TripPlan> byDate = service.search(trips, TripQuery.empty(), this::nickname);
        List<TripPlan> byNew = service.search(
                trips,
                new TripQuery("", null, null, null, Set.of(), TripQuery.SortOrder.NEW),
                this::nickname);

        // Then
        assertAll(
                () -> assertEquals(List.of(1L, 2L, 3L), ids(byDate), "date ascending, created desc as tie-break"),
                () -> assertEquals(List.of(3L, 1L, 2L), ids(byNew), "newest first")
        );
    }

    private TripQuery query(String keyword, String destination, LocalDate from, LocalDate to, Set<String> tags) {
        return new TripQuery(keyword, destination, from, to, tags, TripQuery.SortOrder.DATE);
    }

    private List<Long> ids(List<TripPlan> found) {
        return found.stream().map(TripPlan::id).toList();
    }

    private String nickname(Long publisherId) {
        return publisherId == 2L ? "陈屿" : "林见夏";
    }

    private TripPlan trip(
            long id,
            long publisherId,
            String title,
            String destination,
            String startDate,
            String endDate,
            List<String> tags,
            String createdAt) {
        return new TripPlan(
                id,
                publisherId,
                title,
                destination,
                LocalDate.parse(startDate),
                LocalDate.parse(endDate),
                List.of(destination + "集合", "途经点二"),
                null,
                null,
                null,
                null,
                tags,
                4,
                1,
                null,
                Instant.parse(createdAt),
                Instant.parse(createdAt));
    }
}