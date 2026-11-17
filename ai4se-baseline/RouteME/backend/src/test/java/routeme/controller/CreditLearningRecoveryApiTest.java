package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;

import routeme.constant.CreditLearningConstant;
import routeme.entity.CreditLedgerEntity;

/**
 * 恢复记账与月度恢复配额（REQ-022 R4 / R5 / R7）：
 * 实际变化量 = 60 − 恢复前分数，同月只恢复一次，未通过不占恢复次数。
 */
class CreditLearningRecoveryApiTest extends CreditLearningTestSupport {

    @Test
    void in_fortyFive_out_recoveredByFifteenWithLedgerRow() throws Exception {
        // Given
        long userId = register("RecoveryFortyFive");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);
        String monthKey = sessionMapper.selectById(sessionId).getMonthKey();
        completeLessons(userId, sessionId);

        // When
        submitAnswers(userId, sessionId, answersFor(sessionId, 8))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recovery_applied").value(true))
                .andExpect(jsonPath("$.credit_score").value(60));

        List<CreditLedgerEntity> rows = recoveryRows(userId);
        assertAll(
                () -> assertEquals(1, rows.size(), "one recovery row"),
                () -> assertEquals(45, rows.getFirst().getScoreBefore(), "score before"),
                () -> assertEquals(15, rows.getFirst().getAppliedDelta(), "actual delta"),
                () -> assertEquals(60, rows.getFirst().getScoreAfter(), "score after"),
                () -> assertEquals(CreditLearningConstant.RELATED_TYPE_LEARNING_SESSION,
                        rows.getFirst().getRelatedType(), "related type points at the session"),
                () -> assertEquals(String.valueOf(sessionId), rows.getFirst().getRelatedId(), "related id"),
                () -> assertEquals("learning-recovery:" + userId + ":" + monthKey,
                        rows.getFirst().getIdempotencyKey(), "monthly idempotency key"));
    }

    @Test
    void in_fiftyNine_out_plusOneOnly() throws Exception {
        // Given
        long userId = register("RecoveryFiftyNine");
        setScore(userId, 59);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);

        // When
        submitAnswers(userId, sessionId, answersFor(sessionId, 8))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(60));

        assertAll(
                () -> assertEquals(1, recoveryRows(userId).getFirst().getAppliedDelta(), "only +1"),
                () -> assertEquals(60, creditService.read(userId).score(), "never above the target"));
    }

    @Test
    void in_repeatSubmission_out_singleRecovery() throws Exception {
        // Given
        long userId = register("RecoveryRepeat");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);
        List<Integer> answers = answersFor(sessionId, 8);
        submitAnswers(userId, sessionId, answers)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recovery_applied").value(true));

        // When
        submitAnswers(userId, sessionId, answers)
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.credit_score").value(60));

        assertAll(
                () -> assertEquals(1, recoveryRows(userId).size(), "no second recovery row"),
                () -> assertEquals(60, creditService.read(userId).score(), "score unchanged by replay"));
    }

    @Test
    void in_alreadyRecoveredThisMonth_out_recoveryQuotaExceeded() throws Exception {
        // Given
        long userId = register("RecoveryQuota");
        setScore(userId, 45);
        long first = startSessionId(userId);
        completeLessons(userId, first);
        submitAnswers(userId, first, answersFor(first, 8)).andExpect(status().isOk());

        setScore(userId, 45);
        long second = startSessionId(userId);
        completeLessons(userId, second);

        // When
        submitAnswers(userId, second, answersFor(second, 8))
                // Then
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LEARNING_RECOVERY_QUOTA_EXCEEDED"));

        assertAll(
                () -> assertEquals(1, recoveryRows(userId).size(), "no second recovery row"),
                () -> assertEquals(45, creditService.read(userId).score(), "score stays where it was"));
    }

    @Test
    void in_failureThenPass_out_recovered() throws Exception {
        // Given
        long userId = register("RecoveryAfterFail");
        setScore(userId, 45);
        long failed = startSessionId(userId);
        completeLessons(userId, failed);
        submitAnswers(userId, failed, answersFor(failed, 7))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(false));

        // When
        long retake = startSessionId(userId);
        completeLessons(userId, retake);
        submitAnswers(userId, retake, answersFor(retake, 8))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recovery_applied").value(true));

        assertAll(
                () -> assertEquals(60, creditService.read(userId).score(), "failure consumed no recovery"),
                () -> assertEquals(1, recoveryRows(userId).size(), "single recovery row"));
    }

    @Test
    void in_zeroScore_out_recoveredBySixty() throws Exception {
        // Given
        long userId = register("RecoveryZero");
        setScore(userId, 0);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);

        // When
        submitAnswers(userId, sessionId, answersFor(sessionId, 8))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(60));

        assertAll(
                () -> assertEquals(60, recoveryRows(userId).getFirst().getAppliedDelta(), "delta is +60"),
                () -> assertTrue(creditService.read(userId).score() == 60, "recovered to the target"));
    }
}
