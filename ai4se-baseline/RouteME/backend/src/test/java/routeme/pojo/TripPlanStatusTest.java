package routeme.pojo;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import routeme.enums.TripStatusEnum;
import routeme.exception.InvalidInputException;

class TripPlanStatusTest {

    private static final Instant CREATED = Instant.parse("2026-11-01T00:00:00Z");

    @Test
    void in_notStarted_out_recruitingOrFull() {
        TripPlan recruiting = trip(LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 20), 1, 4, null);
        TripPlan full = trip(LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 20), 4, 4, null);

        assertEquals(TripStatusEnum.RECRUITING, recruiting.status(at("2026-11-16T09:00:00Z")));
        assertEquals(TripStatusEnum.FULL, full.status(at("2026-11-16T09:00:00Z")));
    }

    @Test
    void in_startDate_out_ongoingEvenWhenFull() {
        TripPlan ongoing = trip(LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 16), 1, 4, null);
        TripPlan ongoingFull = trip(LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 16), 4, 4, null);

        assertEquals(TripStatusEnum.ONGOING, ongoing.status(at("2026-11-15T16:00:00Z")), "start day 00:00");
        assertEquals(TripStatusEnum.ONGOING, ongoingFull.status(at("2026-11-16T09:00:00Z")));
    }

    @Test
    void in_endDate_out_ongoingUntilNextDayStart() {
        TripPlan trip = trip(LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 16), 1, 4, null);

        assertEquals(TripStatusEnum.ONGOING, trip.status(at("2026-11-16T15:59:59Z")), "before next day 00:00");
        assertEquals(TripStatusEnum.COMPLETED, trip.status(at("2026-11-16T16:00:00Z")), "next day 00:00");
    }

    @Test
    void in_manualCompletedAt_out_completedWins() {
        TripPlan trip = trip(
                LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 16), 1, 4,
                Instant.parse("2026-11-16T02:00:00Z"));

        assertEquals(TripStatusEnum.COMPLETED, trip.status(at("2026-11-16T03:00:00Z")));
    }

    @Test
    void in_cancelledAt_out_cancelledWinsOverDateAndPeople() {
        TripPlan cancelled = cancelledTrip(Instant.parse("2026-11-10T00:00:00Z"));

        assertEquals(TripStatusEnum.CANCELLED, cancelled.status(at("2026-11-09T00:00:00Z")));
        assertEquals(TripStatusEnum.CANCELLED, cancelled.status(at("2026-11-16T09:00:00Z")));
        assertFalse(cancelled.endingSoon(at("2026-11-16T15:00:00Z")));
    }

    @Test
    void in_endingWindow_out_threeHoursBeforePlannedEnd() {
        TripPlan trip = trip(LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 16), 1, 4, null);

        assertFalse(trip.endingSoon(at("2026-11-16T12:59:59Z")), "before 21:00 Beijing");
        assertTrue(trip.endingSoon(at("2026-11-16T13:00:00Z")), "at 21:00 Beijing");
        assertTrue(trip.endingSoon(at("2026-11-16T15:59:59Z")), "before auto completion");
        assertFalse(trip.endingSoon(at("2026-11-16T16:00:00Z")), "already completed");
    }

    @Test
    void in_pastStartDate_out_publishRejected() {
        TripPlanDraft draft = new TripPlanDraft(
                1L, "测试行程", "440400",
                LocalDate.of(2026, 11, 15), LocalDate.of(2026, 11, 15),
                List.of("香洲港", "情侣路"), null, null, null, null, null, null, List.of(), 3, null);

        assertThrows(InvalidInputException.class,
                () -> TripPlan.create(draft, at("2026-11-16T09:00:00Z"), LocalDate.of(2026, 11, 16)));
    }

    @Test
    void in_todayStartDate_out_publishOngoing() {
        TripPlanDraft draft = new TripPlanDraft(
                1L, "测试行程", "440400",
                LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 16),
                List.of("香洲港", "情侣路"), null, null, null, null, null, null, List.of(), 3, null);

        TripPlan created = TripPlan.create(draft, at("2026-11-16T09:00:00Z"), LocalDate.of(2026, 11, 16));

        assertEquals(TripStatusEnum.ONGOING, created.status(at("2026-11-16T09:00:00Z")));
    }

    private static Instant at(String value) {
        return Instant.parse(value);
    }

    private static TripPlan trip(
            LocalDate start, LocalDate end, int joined, int capacity, Instant completedAt) {
        return new TripPlan(
                1L, 1L, "测试行程", "440400", "珠海市", start, end,
                List.of("香洲港", "情侣路"), null, null, null, null, null, null, List.of(),
                capacity, joined, completedAt, CREATED, CREATED, null, null, null, null);
    }

    private static TripPlan cancelledTrip(Instant cancelledAt) {
        return new TripPlan(
                1L, 1L, "测试行程", "440400", "珠海市",
                LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 16),
                List.of("香洲港", "情侣路"), null, null, null, null, null, null, List.of(),
                4, 1, null, CREATED, CREATED, cancelledAt, "personal", null, null);
    }
}
