package routeme.controller;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;
import routeme.pojo.TripPlan;
import routeme.request.TripCancelRequest;
import routeme.request.TripCreateRequest;
import routeme.service.TripPlanService;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class RecommendationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TripPlanService tripPlanService;

    @Test
    void in_publishedTrip_out_rankedExplainableRecommendations() throws Exception {
        // When
        String body = mockMvc.perform(get("/api/trips/4/recommendations").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reference.trip_id").value(4))
                .andExpect(jsonPath("$.reference.destination").isNotEmpty())
                .andExpect(jsonPath("$.reference.start_date").value("2026-11-16"))
                .andExpect(jsonPath("$.reference.interests").isArray())
                .andExpect(jsonPath("$.items").isArray())
                .andReturn().getResponse().getContentAsString();

        List<Integer> scores = JsonPath.read(body, "$.items[*].score");
        List<Integer> userIds = JsonPath.read(body, "$.items[*].user.id");
        List<List<Map<String, Object>>> breakdowns = JsonPath.read(body, "$.items[*].breakdown");
        List<List<String>> reasons = JsonPath.read(body, "$.items[*].reasons");

        // Then
        assertAll(
                () -> assertFalse(scores.isEmpty(), "candidates"),
                () -> assertTrue(descending(scores), "sorted by score"),
                () -> assertEquals(userIds.size(), new HashSet<>(userIds).size(), "one item per user"),
                () -> assertFalse(userIds.contains(1), "viewer is excluded"),
                () -> scores.forEach(score -> assertTrue(score > 0, "zero score filtered")),
                () -> assertEquals(scores.size(), breakdowns.size(), "breakdown per item"),
                () -> assertEquals(scores.size(), reasons.size(), "reason list per item"));
        for (int index = 0; index < scores.size(); index += 1) {
            int score = scores.get(index);
            int sum = breakdowns.get(index).stream()
                    .mapToInt(item -> ((Number) item.get("points")).intValue())
                    .sum();
            assertEquals(score, sum, "breakdown sum equals score at " + index);
            assertTrue(
                    reasons.get(index).get(0).matches(".+ \\+\\d+"),
                    "reason carries dimension and points at " + index);
        }
    }

    @Test
    void in_candidateWithoutOverlap_out_emptyList() throws Exception {
        mockMvc.perform(get("/api/trips/7/recommendations").header("X-User-Id", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void in_viewerOwnTrip_out_notRecommended() throws Exception {
        // When
        String body = mockMvc.perform(get("/api/trips/5/recommendations").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> userIds = JsonPath.read(body, "$.items[*].user.id");
        List<Integer> tripIds = JsonPath.read(body, "$.items[*].trip.id");

        // Then
        assertAll(
                () -> assertFalse(userIds.contains(2), "own user excluded"),
                () -> assertFalse(tripIds.contains(5), "reference trip excluded")
        );
    }

    @Test
    void in_cancelledCandidate_out_excludedFromRecommendations() throws Exception {
        // Given: a would-be matching trip from user 4, then cancelled.
        TripPlan created = tripPlanService.create(new TripCreateRequest(
                "推荐过滤取消行程",
                "440100",
                LocalDate.parse("2026-11-20"),
                LocalDate.parse("2026-11-20"),
                List.of("集合", "终点"),
                List.of(),
                null,
                null,
                null,
                null,
                null,
                List.of("摄影"),
                4,
                null), 4L);
        tripPlanService.cancel(created.id(), 4L, new TripCancelRequest("personal", null));

        // Then
        mockMvc.perform(get("/api/trips/4/recommendations").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.trip.id == " + created.id() + ")]").isEmpty())
                .andExpect(jsonPath("$.items[?(@.user.id == 4)]").isEmpty());
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/trips/4/recommendations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_unknownTrip_out_notFound() throws Exception {
        mockMvc.perform(get("/api/trips/9999/recommendations").header("X-User-Id", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    private boolean descending(List<Integer> scores) {
        for (int index = 1; index < scores.size(); index += 1) {
            if (scores.get(index) > scores.get(index - 1)) {
                return false;
            }
        }
        return true;
    }
}