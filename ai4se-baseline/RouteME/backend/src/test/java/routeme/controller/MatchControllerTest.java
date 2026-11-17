package routeme.controller;

import java.util.List;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.junit.jupiter.api.Assertions.assertAll;
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

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class MatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_matches_out_sortedByScoreWithReasons() throws Exception {
        // When
        String body = mockMvc.perform(get("/api/matches").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.items[0].trip.title").exists())
                .andExpect(jsonPath("$.items[0].match.reasons").isArray())
                .andReturn().getResponse().getContentAsString();
        List<Integer> scores = JsonPath.read(body, "$.items[*].match.score");

        // Then
        assertAll(
                () -> assertFalse(scores.isEmpty(), "candidates"),
                () -> assertTrue(descending(scores), "sorted by score"),
                () -> assertTrue(body.contains("对照你的旅行兴趣"), "interest basis for user 1")
        );
    }

    @Test
        void in_filteredList_out_sameScoreAsDetail() throws Exception {
            // When
            String body = mockMvc.perform(get("/api/matches")
                            .param("destination_code", "440100")
                            .header("X-User-Id", "2"))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            List<Integer> listScores = JsonPath.read(body, "$.items[*].match.score");
            List<Integer> tripIds = JsonPath.read(body, "$.items[*].trip.id");
            List<List<String>> reasons = JsonPath.read(body, "$.items[*].match.reasons");

            // Then
            assertFalse(listScores.isEmpty(), "filtered candidates");
            for (int index = 0; index < listScores.size(); index += 1) {
                int expected = listScores.get(index);
                String expectedReason = reasons.get(index).get(0);
                mockMvc.perform(get("/api/matches/" + tripIds.get(index)).header("X-User-Id", "2"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.match.score").value(expected))
                        .andExpect(jsonPath("$.match.reasons[0]").value(expectedReason));
            }
        }

        @Test
        void in_matchDetailWithReferenceTrip_out_fullScore() throws Exception {
        // user 2's latest unfinished trip is trip 5, so matching trip 5 against it scores 100.
        mockMvc.perform(get("/api/matches/5").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trip.id").value(5))
                .andExpect(jsonPath("$.match.score").value(100))
                .andExpect(jsonPath("$.match.basis").value("对照你发布的《深圳大鹏半岛海岸线徒步》"))
                .andExpect(jsonPath("$.match.reasons").isArray());
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/matches"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_unknownTrip_out_notFound() throws Exception {
        mockMvc.perform(get("/api/matches/9999").header("X-User-Id", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void in_invalidSort_out_invalidInput() throws Exception {
        mockMvc.perform(get("/api/matches").header("X-User-Id", "1").param("sort", "score"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_pageWindow_out_slicedCandidates() throws Exception {
        mockMvc.perform(get("/api/matches").header("X-User-Id", "1").param("page", "1").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.total_pages", greaterThanOrEqualTo(2)));

        mockMvc.perform(get("/api/matches").header("X-User-Id", "1").param("size", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    private boolean descending(List<Integer> scores) {
        for (int index = 1; index < scores.size(); index++) {
            if (scores.get(index) > scores.get(index - 1)) {
                return false;
            }
        }
        return true;
    }
}