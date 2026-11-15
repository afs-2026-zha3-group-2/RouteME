package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TripControllerTest {

    private static final String VALID_TRIP = """
            {
              "title": "广州老城骑楼扫街半日",
              "destination": "广州",
              "start_date": "2026-11-20",
              "end_date": "2026-11-20",
              "stops": ["陈家祠地铁站集合", "永庆坊"],
              "meeting_area": "陈家祠地铁站 D 口",
              "budget_min_cents": 8000,
              "budget_max_cents": 15000,
              "tags": ["摄影", "历史"],
              "capacity": 4,
              "note": "走街串巷为主。"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_validRequest_out_createdRecruitingTrip() throws Exception {
        ResultActions result = postTrip(VALID_TRIP, "1");

        result.andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("recruiting"))
                .andExpect(jsonPath("$.joined_count").value(1))
                .andExpect(jsonPath("$.capacity").value(4))
                .andExpect(jsonPath("$.publisher.id").value(1))
                .andExpect(jsonPath("$.participants[0].id").value(1))
                .andExpect(jsonPath("$.start_date").value("2026-11-20"))
                .andExpect(jsonPath("$.budget_max_cents").value(15000));
    }

    @Test
    void in_missingTitle_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"广州老城骑楼扫街半日\"", "\"  \"");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_endBeforeStart_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"end_date\": \"2026-11-20\"", "\"end_date\": \"2026-11-19\"");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_singleStop_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("[\"陈家祠地铁站集合\", \"永庆坊\"]", "[\"只有一处\"]");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_capacityOutOfRange_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"capacity\": 4", "\"capacity\": 1");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_budgetInverted_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"budget_min_cents\": 8000", "\"budget_min_cents\": 20000");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingUserHeader_out_demoUserRequired() throws Exception {
        postTrip(VALID_TRIP, null).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_unknownUser_out_demoUserRequired() throws Exception {
        postTrip(VALID_TRIP, "99").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    private ResultActions postTrip(String body, String userId) throws Exception {
        var request = post("/api/trips")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
        if (userId != null) {
            request.header("X-User-Id", userId);
        }
        return mockMvc.perform(request);
    }
}