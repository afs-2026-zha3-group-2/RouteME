package routeme.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.junit.jupiter.api.Test;

import routeme.constant.TripTimeZoneConstant;
import routeme.enums.CreditExitMessageCode;
import routeme.enums.CreditExitPenaltyTier;
import routeme.enums.CreditExitReasonEnum;
import routeme.enums.CreditExitReviewStatus;
import routeme.pojo.CreditExitPreview;
import routeme.pojo.TripPlan;

class CreditExitCalculatorTest {

    private static final Instant NOW = Instant.parse("2026-11-17T00:00:00Z");
    private static final DateTimeFormatter MEETING = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    @Test
    void in_48Hours_out_minus5() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(48)), CreditExitReasonEnum.PERSONAL, 80, 0);
        assertEquals(CreditExitPenaltyTier.H24TO72, preview.penaltyTier());
        assertEquals(-5, preview.theoreticalDelta());
        assertEquals(-5, preview.appliedDelta());
        assertEquals(1, preview.monthlyOrdinal());
        assertTrue(preview.counted());
        assertEquals(75, preview.resultingScore());
    }

    @Test
    void in_exactlySevenDays_out_zero() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofDays(7)), CreditExitReasonEnum.PERSONAL, 80, 0);
        assertEquals(CreditExitPenaltyTier.GE7D, preview.penaltyTier());
        assertEquals(0, preview.theoreticalDelta());
        assertEquals(0, preview.monthlyOrdinal());
        assertFalse(preview.counted());
        assertEquals(CreditExitMessageCode.NO_PENALTY, preview.messageCode());
    }

    @Test
    void in_exactlyThreeDaysAnd72Hours_out_minus3() {
        CreditExitPreview threeDays = preview(meetingAfter(Duration.ofDays(3)), CreditExitReasonEnum.PERSONAL, 80, 0);
        CreditExitPreview seventyTwoHours = preview(meetingAfter(Duration.ofHours(72)), CreditExitReasonEnum.PERSONAL, 80, 0);
        assertEquals(CreditExitPenaltyTier.D3TO7D, threeDays.penaltyTier());
        assertEquals(-3, threeDays.theoreticalDelta());
        assertEquals(CreditExitPenaltyTier.D3TO7D, seventyTwoHours.penaltyTier());
        assertEquals(-3, seventyTwoHours.theoreticalDelta());
    }

    @Test
    void in_exactly24Hours_out_minus5() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(24)), CreditExitReasonEnum.PERSONAL, 80, 0);
        assertEquals(CreditExitPenaltyTier.H24TO72, preview.penaltyTier());
        assertEquals(-5, preview.theoreticalDelta());
    }

    @Test
    void in_exactly12Hours_out_minus8() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(12)), CreditExitReasonEnum.PERSONAL, 80, 0);
        assertEquals(CreditExitPenaltyTier.H12TO24, preview.penaltyTier());
        assertEquals(-8, preview.theoreticalDelta());
    }

    @Test
    void in_oneSecondBefore12Hours_out_minus10() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(12).minusSeconds(1)),
                CreditExitReasonEnum.PERSONAL, 80, 0);
        assertEquals(CreditExitPenaltyTier.LT12H, preview.penaltyTier());
        assertEquals(-10, preview.theoreticalDelta());
    }

    @Test
    void in_duringTrip_out_minus15NotCounted() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(-1)), CreditExitReasonEnum.PERSONAL, 80, 3);
        assertEquals(CreditExitPenaltyTier.DURING, preview.penaltyTier());
        assertEquals(-15, preview.theoreticalDelta());
        assertEquals(0, preview.monthlyOrdinal());
        assertFalse(preview.counted());
        assertEquals(CreditExitMessageCode.DURING_TRIP, preview.messageCode());
    }

    @Test
    void in_secondEffectivePreTripExit_out_doubled() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(48)), CreditExitReasonEnum.PERSONAL, 80, 1);
        assertTrue(preview.monthlyDoubled());
        assertEquals(2, preview.monthlyOrdinal());
        assertEquals(-10, preview.theoreticalDelta());
        assertEquals(70, preview.resultingScore());
        assertEquals(CreditExitMessageCode.PENALTY_DOUBLED, preview.messageCode());
    }

    @Test
    void in_forceMajeure_out_pendingZero() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(48)), CreditExitReasonEnum.FORCE_MAJEURE, 80, 1);
        assertEquals(0, preview.theoreticalDelta());
        assertEquals(0, preview.monthlyOrdinal());
        assertFalse(preview.counted());
        assertEquals(CreditExitReviewStatus.PENDING, preview.reviewStatus());
        assertEquals(CreditExitMessageCode.PENDING_REVIEW, preview.messageCode());
    }

    @Test
    void in_scoreAtFloor_out_appliedZeroButEventCounted() {
        CreditExitPreview preview = preview(meetingAfter(Duration.ofHours(48)), CreditExitReasonEnum.PERSONAL, 0, 0);
        assertEquals(-5, preview.theoreticalDelta());
        assertEquals(0, preview.appliedDelta());
        assertEquals(0, preview.resultingScore());
        assertTrue(preview.counted());
        assertEquals(CreditExitMessageCode.AT_FLOOR, preview.messageCode());
    }

    @Test
    void in_meetingTimePresent_out_usesMeetingTime() {
        TripPlan trip = trip("2026-11-19T08:00", LocalDate.of(2026, 11, 25));
        Instant expected = LocalDateTime.parse("2026-11-19T08:00")
                .atZone(TripTimeZoneConstant.ZONE).toInstant();
        assertEquals(expected, CreditExitCalculator.departureAt(trip));
    }

    @Test
    void in_meetingTimeBlank_out_usesStartDate() {
        TripPlan trip = trip(null, LocalDate.of(2026, 11, 25));
        Instant expected = LocalDate.of(2026, 11, 25).atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();
        assertEquals(expected, CreditExitCalculator.departureAt(trip));
    }

    @Test
    void in_monthBoundaryShanghai_out_monthStart() {
        Instant at = Instant.parse("2026-12-01T00:00:00Z");
        CreditExitCalculator.MonthWindow window = CreditExitCalculator.monthWindow(at);
        assertEquals(Instant.parse("2026-11-30T16:00:00Z"), window.start());
        assertEquals(Instant.parse("2026-12-31T16:00:00Z"), window.end());
    }

    private static CreditExitPreview preview(String meetingTime, CreditExitReasonEnum reason, int score, int count) {
        return CreditExitCalculator.preview(trip(meetingTime, LocalDate.of(2026, 11, 25)), reason, score, count, NOW);
    }

    private static String meetingAfter(Duration duration) {
        return NOW.plus(duration).atZone(TripTimeZoneConstant.ZONE).toLocalDateTime().format(MEETING);
    }

    private static TripPlan trip(String meetingTime, LocalDate startDate) {
        return new TripPlan(
                1L, 1L, "trip", null, null, "440400", "珠海", startDate, startDate.plusDays(1),
                List.of(), List.of(), meetingTime, null, null, null, null, List.of(), 3, 2,
                null, NOW, NOW, null, null, null, null);
    }
}
