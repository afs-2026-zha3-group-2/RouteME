package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class CreditMonthTest {

    @Test
    void in_utcMonthBoundary_out_beijingMonth() {
        assertAll(
                () -> assertEquals("2026-12", CreditMonth.monthKey(Instant.parse("2026-11-30T16:00:00Z")),
                        "16:00Z is 00:00 on Dec 1 in Asia/Shanghai"),
                () -> assertEquals("2026-11", CreditMonth.monthKey(Instant.parse("2026-11-30T15:59:00Z")),
                        "15:59Z is still November in Asia/Shanghai"),
                () -> assertEquals("2026-12", CreditMonth.monthKey(Instant.parse("2026-11-30T23:30:00Z")),
                        "late UTC November is already December in Asia/Shanghai"));
    }

    @Test
    void in_userAndMonth_out_stableRecoveryKey() {
        assertAll(
                () -> assertEquals("learning-recovery:2:2026-11", CreditLearningKey.recoveryKey(2L, "2026-11")),
                () -> assertEquals(
                        CreditLearningKey.recoveryKey(2L, "2026-11"),
                        CreditLearningKey.recoveryKey(2L, "2026-11"),
                        "same user and month produce the same key"),
                () -> assertEquals(
                        false,
                        CreditLearningKey.recoveryKey(2L, "2026-11")
                                .equals(CreditLearningKey.recoveryKey(2L, "2026-12")),
                        "different months produce different keys"));
    }
}
