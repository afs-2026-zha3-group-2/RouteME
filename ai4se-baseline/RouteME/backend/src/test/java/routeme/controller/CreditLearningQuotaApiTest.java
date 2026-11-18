package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

import routeme.config.MutableClockTestConfig;
import routeme.config.MutableClockTestConfig.MutableClock;

/**
 * 月度考试配额与跨自然月窗口（REQ-027 R5）：用可推进时钟覆盖月底到月初的边界。
 */
@Import(MutableClockTestConfig.class)
class CreditLearningQuotaApiTest extends CreditLearningTestSupport {

    private static final Instant NOVEMBER = Instant.parse("2026-11-16T09:00:00Z");
    /** UTC 仍是 11-30，北京时间已是 12-01 07:30。 */
    private static final Instant DECEMBER_EDGE = Instant.parse("2026-11-30T23:30:00Z");

    @Autowired
    private MutableClock clock;

    @BeforeEach
    void resetClock() {
        clock.set(NOVEMBER);
    }

    @Test
    void in_thirdExamInSameMonth_out_tooManyRequests() throws Exception {
        // Given
        long userId = register("QuotaThird");
        setScore(userId, 45);
        startSessionId(userId);
        startSessionId(userId);

        // When
        startSession(userId)
                // Then
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("LEARNING_EXAM_QUOTA_EXCEEDED"));

        assertEquals(2, sessionCount(userId), "no third session");
    }

    @Test
    void in_monthRolloverByBeijingTime_out_freshQuota() throws Exception {
        // Given
        long userId = register("QuotaRollover");
        setScore(userId, 45);
        startSessionId(userId);
        startSessionId(userId);

        // When
        clock.set(DECEMBER_EDGE);

        // Then
        startSession(userId)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.month").value("2026-12"))
                .andExpect(jsonPath("$.exam_used").value(1))
                .andExpect(jsonPath("$.exam_limit").value(2));

        assertEquals(3, sessionCount(userId), "previous month keeps its two sessions");
    }

    @Test
    void in_recoveryLastMonth_out_recoversAgainThisMonth() throws Exception {
        // Given
        long userId = register("QuotaRecoveryMonth");
        setScore(userId, 45);
        long november = startSessionId(userId);
        completeLessons(userId, november);
        submitAnswers(userId, november, answersFor(november, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(60));

        // When
        clock.set(DECEMBER_EDGE);
        setScore(userId, 45);
        long december = startSessionId(userId);
        completeLessons(userId, december);

        // Then
        submitAnswers(userId, december, answersFor(december, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recovery_applied").value(true))
                .andExpect(jsonPath("$.credit_score").value(60));

        assertAll(
                () -> assertEquals(2, recoveryRows(userId).size(), "one recovery per month"),
                () -> assertEquals(60, creditService.read(userId).score(), "recovered again"));
    }
}
