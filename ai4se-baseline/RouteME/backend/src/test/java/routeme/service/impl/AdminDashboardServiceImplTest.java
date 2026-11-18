package routeme.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

/**
 * Pure bucketing and window math used by the admin dashboard (ATDD U1 / U2).
 *
 * <p>These helpers carry no I/O so the edge cases that the seeded database cannot express
 * (missing or malformed timestamps, millisecond boundaries) are covered here.</p>
 */
class AdminDashboardServiceImplTest {

    private static final Instant NOW = Instant.parse("2026-11-16T09:00:00Z");
    private static final Instant SEVEN_DAY_START = Instant.parse("2026-11-09T16:00:00Z");
    private static final Instant THIRTY_DAY_START = Instant.parse("2026-10-17T16:00:00Z");

    @Test
    void in_fixedKeys_out_zeroFilledInOrder() {
        Map<String, Long> counts = AdminDashboardServiceImpl.zeroFilled(List.of("a", "b", "c"));

        assertEquals(List.of("a", "b", "c"), List.copyOf(counts.keySet()), "key order");
        assertEquals(List.of(0L, 0L, 0L), List.copyOf(counts.values()), "zero values");
    }

    @Test
    void in_mergedCounts_out_totalEqualsSum() {
        Map<String, Long> counts = AdminDashboardServiceImpl.zeroFilled(List.of("a", "b"));

        AdminDashboardServiceImpl.merge(counts, "a");
        AdminDashboardServiceImpl.merge(counts, "a");
        AdminDashboardServiceImpl.merge(counts, "b");

        assertEquals(3L, counts.values().stream().mapToLong(Long::longValue).sum(), "sum");
        assertEquals(2L, counts.get("a"), "a");
        assertEquals(1L, counts.get("b"), "b");
    }

    @Test
    void in_windowBoundaries_out_inclusiveStartAndNow() {
        assertTrue(AdminDashboardServiceImpl.isWithinWindow(SEVEN_DAY_START.toString(), SEVEN_DAY_START, NOW),
                "at start is inside");
        assertFalse(AdminDashboardServiceImpl.isWithinWindow(
                SEVEN_DAY_START.minusMillis(1).toString(), SEVEN_DAY_START, NOW), "one ms before start");
        assertTrue(AdminDashboardServiceImpl.isWithinWindow(NOW.toString(), SEVEN_DAY_START, NOW),
                "at now is inside");
        assertFalse(AdminDashboardServiceImpl.isWithinWindow(
                NOW.plusMillis(1).toString(), SEVEN_DAY_START, NOW), "future is outside");
    }

    @Test
    void in_thirtyDayWindow_out_usesItsOwnStart() {
        assertTrue(AdminDashboardServiceImpl.isWithinWindow(
                THIRTY_DAY_START.toString(), THIRTY_DAY_START, NOW), "at 30 day start");
        assertFalse(AdminDashboardServiceImpl.isWithinWindow(
                THIRTY_DAY_START.minusMillis(1).toString(), THIRTY_DAY_START, NOW), "before 30 day start");
        assertFalse(AdminDashboardServiceImpl.isWithinWindow(
                THIRTY_DAY_START.toString(), SEVEN_DAY_START, NOW), "30 day start is outside 7 days");
    }

    @Test
    void in_missingOrMalformedTimestamp_out_excluded() {
        assertFalse(AdminDashboardServiceImpl.isWithinWindow(null, SEVEN_DAY_START, NOW), "null");
        assertFalse(AdminDashboardServiceImpl.isWithinWindow("", SEVEN_DAY_START, NOW), "blank");
        assertFalse(AdminDashboardServiceImpl.isWithinWindow("not-a-timestamp", SEVEN_DAY_START, NOW),
                "malformed");
    }

    @Test
    void in_offsetTimestamp_out_comparedAsInstant() {
        assertTrue(AdminDashboardServiceImpl.isWithinWindow(
                "2026-11-10T00:00:00+08:00", SEVEN_DAY_START, NOW), "Shanghai day boundary");
    }
}