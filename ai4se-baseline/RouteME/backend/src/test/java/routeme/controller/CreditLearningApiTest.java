package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import routeme.pojo.UserCredit;
import routeme.utils.CreditLearningKey;

/**
 * 安全学习考试：开始即计次、参加资格、身份边界、学习完成门禁与判分（REQ-027 R2 / R3）。
 */
class CreditLearningApiTest extends CreditLearningTestSupport {

    @Test
    void in_lowScore_out_sessionWithTenQuestions() throws Exception {
        // Given
        long userId = register("LearnLow");
        setScore(userId, 45);

        // When
        MvcResult started = startSession(userId)
                // Then
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exam_used").value(1))
                .andExpect(jsonPath("$.exam_limit").value(2))
                .andExpect(jsonPath("$.month").value(org.hamcrest.Matchers.matchesPattern("\\d{4}-\\d{2}")))
                .andExpect(jsonPath("$.learning_completed").value(false))
                .andExpect(jsonPath("$.questions.length()").value(10))
                .andReturn();

        String body = started.getResponse().getContentAsString();
        List<String> categories = JsonPath.read(body, "$.questions[*].category");
        List<String> questionIds = JsonPath.read(body, "$.questions[*].id");
        List<String> bankIds = questionBank.all().stream().map(question -> question.id()).toList();

        assertAll(
                () -> assertNotNull(JsonPath.read(body, "$.session_id"), "session id returned"),
                () -> assertTrue(categories.containsAll(List.of(
                        "travel_safety", "stranger_companion", "platform_rules", "privacy")),
                        "four categories covered: " + categories),
                () -> assertTrue(bankIds.containsAll(questionIds), "questions come from the bank"),
                () -> assertEquals(1, sessionCount(userId), "session row created"));
    }

    @Test
    void in_scoreAtSixty_out_notEligible() throws Exception {
        // Given
        long userId = register("LearnSixty");
        setScore(userId, 60);

        // When
        startSession(userId)
                // Then
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LEARNING_NOT_ELIGIBLE"));

        assertEquals(0, sessionCount(userId), "no session created");
    }

    @Test
    void in_missingUserHeader_out_demoUserRequired() throws Exception {
        // When
        mockMvc.perform(post(SESSIONS))
                // Then
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));

        assertEquals(0, sessionMapper.selectCount(null), "no session created");
    }

    @Test
    void in_bodyCarriesOtherUser_out_requestActsOnCallerOnly() throws Exception {
        // Given
        long caller = register("LearnCaller");
        long other = register("LearnOther");
        setScore(caller, 45);
        setScore(other, 40);

        // When
        mockMvc.perform(post(SESSIONS)
                        .header("X-User-Id", caller)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"user_id\": %d}".formatted(other)))
                // Then
                .andExpect(status().isCreated());

        assertAll(
                () -> assertEquals(1, sessionCount(caller), "caller owns the session"),
                () -> assertEquals(0, sessionCount(other), "other user untouched"),
                () -> assertEquals(40, creditService.read(other).score(), "other score unchanged"));
    }

    @Test
    void in_lessonsNotCompleted_out_submissionRejected() throws Exception {
        // Given
        long userId = register("LearnIncomplete");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);

        // When
        submitAnswers(userId, sessionId, List.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0))
                // Then
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LEARNING_NOT_COMPLETED"));

        assertAll(
                () -> assertEquals(1, sessionCount(userId), "session preserved"),
                () -> assertEquals(45, creditService.read(userId).score(), "score untouched"));
    }

    @Test
    void in_eightCorrect_out_passedAndRecoveredToSixty() throws Exception {
        // Given
        long userId = register("LearnPass");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);

        // When
        submitAnswers(userId, sessionId, answersFor(sessionId, 8))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.score").value(8))
                .andExpect(jsonPath("$.pass_line").value(8))
                .andExpect(jsonPath("$.details.length()").value(10))
                .andExpect(jsonPath("$.recovery_applied").value(true))
                .andExpect(jsonPath("$.credit_score").value(60))
                .andExpect(jsonPath("$.credit_level").value("fair"));

        assertAll(
                () -> assertEquals(60, creditService.read(userId).score(), "score recovered"),
                () -> assertEquals(1, submissionCount(userId), "session submitted once"));
    }

    @Test
    void in_sevenCorrect_out_failedWithoutScoreChange() throws Exception {
        // Given
        long userId = register("LearnFail");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);
        String monthKey = sessionMapper.selectById(sessionId).getMonthKey();

        // When
        submitAnswers(userId, sessionId, answersFor(sessionId, 7))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(false))
                .andExpect(jsonPath("$.score").value(7))
                .andExpect(jsonPath("$.recovery_applied").value(false))
                .andExpect(jsonPath("$.credit_score").value(45));

        assertAll(
                () -> assertEquals(45, creditService.read(userId).score(), "score untouched"),
                () -> assertTrue(!creditService.recorded(CreditLearningKey.recoveryKey(userId, monthKey)),
                        "failure consumes no recovery quota"));
    }

    @Test
    void in_retakeAfterFailure_out_secondSessionJudgedIndependently() throws Exception {
        // Given
        long userId = register("LearnRetake");
        setScore(userId, 45);
        long failedSession = startSessionId(userId);
        completeLessons(userId, failedSession);
        submitAnswers(userId, failedSession, answersFor(failedSession, 7)).andExpect(status().isOk());

        // When
        MvcResult retake = startSession(userId)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exam_used").value(2))
                .andReturn();
        Number retakeId = JsonPath.read(retake.getResponse().getContentAsString(), "$.session_id");
        completeLessons(userId, retakeId.longValue());

        // Then
        submitAnswers(userId, retakeId.longValue(), answersFor(retakeId.longValue(), 8))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.credit_score").value(60));

        assertEquals(2, sessionCount(userId), "both sessions kept");
    }

    @Test
    void in_sessionResponse_out_noAnswerFields() throws Exception {
        // Given
        long userId = register("LearnNoAnswer");
        setScore(userId, 45);

        // When
        String questionBody = startSession(userId).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long sessionId = ((Number) JsonPath.read(questionBody, "$.session_id")).longValue();
        completeLessons(userId, sessionId);
        String resultBody = submitAnswers(userId, sessionId, answersFor(sessionId, 8))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // Then
        assertAll(
                () -> assertTrue(!questionBody.contains("answer"), "question payload hides answers"),
                () -> assertTrue(!resultBody.contains("answer"), "result payload hides answers"),
                () -> assertTrue(resultBody.contains("\"correct\""), "result reports correctness only"));
    }

    @Test
    void in_incompleteAnswers_out_invalidInput() throws Exception {
        // Given
        long userId = register("LearnShortAnswers");
        setScore(userId, 45);
        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);

        // When
        submitAnswers(userId, sessionId, List.of(0, 0, 0, 0, 0, 0, 0, 0, 0))
                // Then
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        assertAll(
                () -> assertEquals(0, submissionCount(userId), "session not submitted"),
                () -> assertEquals(45, creditService.read(userId).score(), "score untouched"));
    }

    @Test
    void in_userWithoutAccount_out_accountCreatedAndNotEligible() throws Exception {
        // Given
        long userId = register("LearnNoAccount");
        accountMapper.deleteById(userId);

        // When
        startSession(userId)
                // Then
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LEARNING_NOT_ELIGIBLE"));

        assertAll(
                () -> assertEquals(0, sessionCount(userId), "no session created"),
                () -> assertNotNull(accountMapper.selectById(userId), "account created on read"),
                () -> assertEquals(UserCredit.INITIAL_SCORE, creditService.read(userId).score(),
                        "initial score applied"));
    }

    @Test
    void in_unknownUser_out_userNotFound() throws Exception {
        // When
        mockMvc.perform(post(SESSIONS).header("X-User-Id", 9999L))
                // Then
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));

        assertEquals(0, sessionMapper.selectCount(null), "no session created");
    }
}
