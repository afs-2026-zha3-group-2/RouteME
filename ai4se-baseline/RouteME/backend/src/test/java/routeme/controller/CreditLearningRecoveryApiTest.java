package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;

import routeme.constant.CreditLearningConstant;
import routeme.entity.CreditLedgerEntity;

/**
 * 恢复记账与月度恢复配额（REQ-027 R4 / R5 / R7）：
 * 加分梯度为 8 题 +10 / 9 题 +15 / 10 题 +20，且不超过与 60 的缺口；
 * 同月只恢复一次，未通过不占恢复次数。
 */
class CreditLearningRecoveryApiTest extends CreditLearningTestSupport {

    @Test
    void in_fortyFiveWithEightCorrect_out_partialPlusTen() throws Exception {
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
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.recovery_applied").value(true))
                .andExpect(jsonPath("$.credit_score").value(55));

        List<CreditLedgerEntity> rows = recoveryRows(userId);
        assertAll(
                () -> assertEquals(1, rows.size(), "one recovery row"),
                () -> assertEquals(45, rows.getFirst().getScoreBefore(), "score before"),
                () -> assertEquals(10, rows.getFirst().getAppliedDelta(), "eight correct = +10"),
                () -> assertEquals(55, rows.getFirst().getScoreAfter(), "still below the target"),
                () -> assertEquals(CreditLearningConstant.RELATED_TYPE_LEARNING_SESSION,
                        rows.getFirst().getRelatedType(), "related type points at the session"),
                () -> assertEquals(String.valueOf(sessionId), rows.getFirst().getRelatedId(), "related id"),
                () -> assertEquals("learning-recovery:" + userId + ":" + monthKey,
                        rows.getFirst().getIdempotencyKey(), "monthly idempotency key"));
    }

    @Test
    void in_fortyFiveWithNineCorrect_out_plusFifteenToTarget() throws Exception {
        long userId = register("RecoveryNine");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);

        submitAnswers(userId, sessionId, answersFor(sessionId, 9))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.credit_score").value(60));

        assertEquals(15, recoveryRows(userId).getFirst().getAppliedDelta(), "nine correct = +15");
    }

    @Test
    void in_fortyFiveWithPerfectAnswers_out_plusFifteenCappedAtTarget() throws Exception {
        long userId = register("RecoveryPerfect");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);

        submitAnswers(userId, sessionId, answersFor(sessionId, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(60));

        assertAll(
                () -> assertEquals(15, recoveryRows(userId).getFirst().getAppliedDelta(),
                        "perfect bonus 20 is capped by the 15 gap"),
                () -> assertEquals(60, creditService.read(userId).score(), "never above the target"));
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
                .andExpect(jsonPath("$.credit_score").value(55));

        assertAll(
                () -> assertEquals(1, recoveryRows(userId).size(), "no second recovery row"),
                () -> assertEquals(55, creditService.read(userId).score(), "score unchanged by replay"));
    }

    @Test
    void in_alreadyPartiallyRecoveredThisMonth_out_startBlocked() throws Exception {
        // Given
        long userId = register("RecoveryQuota");
        setScore(userId, 45);
        long first = startSessionId(userId);
        completeLessons(userId, first);
        submitAnswers(userId, first, answersFor(first, 8)).andExpect(status().isOk());

        setScore(userId, 45);

        // When / Then：本月恢复额度已用完且仍未到 60，直接拒绝再次开考，避免浪费考试次数。
        startSession(userId)
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
        submitAnswers(userId, retake, answersFor(retake, 10))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recovery_applied").value(true));

        assertAll(
                () -> assertEquals(60, creditService.read(userId).score(), "failure consumed no recovery"),
                () -> assertEquals(1, recoveryRows(userId).size(), "single recovery row"));
    }

    @Test
    void in_zeroScoreWithEightCorrect_out_partialPlusTen() throws Exception {
        // Given
        long userId = register("RecoveryZero");
        setScore(userId, 0);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);

        // When
        submitAnswers(userId, sessionId, answersFor(sessionId, 8))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(10));

        assertAll(
                () -> assertEquals(10, recoveryRows(userId).getFirst().getAppliedDelta(),
                        "eight correct can no longer wipe the whole gap"),
                () -> assertEquals(10, creditService.read(userId).score(), "partial recovery"));
    }
}
