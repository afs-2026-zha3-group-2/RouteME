package routeme.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    void in_destinationOutsideLegacyCatalog_out_created() throws Exception {
        String body = VALID_TRIP.replace("\"destination\": \"广州\"", "\"destination\": \"厦门\"");
        postTrip(body, "1").andExpect(status().isCreated())
                .andExpect(jsonPath("$.destination").value("厦门"));
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

    @Test
    void in_demoUsersEndpoint_out_fourAccounts() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].nickname").value("林见夏"))
                .andExpect(jsonPath("$[0].avatar_initial").value("夏"));
    }

    @Test
    void in_defaultList_out_unfinishedTripsOnly() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.total_pages", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.items[*].id", hasItems(3, 4, 5, 6, 7)))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(1))))
                .andExpect(jsonPath("$.items[*].status", not(hasItem("completed"))))
                .andExpect(jsonPath("$.items[0].start_date").exists())
                .andExpect(jsonPath("$.items[0].publisher.nickname").exists());
    }

    @Test
    void in_filters_out_matchingTrips() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("destination", "珠海"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].destination").value("珠海"));

        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("tags", "历史"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", hasItem(6)));

        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("date_from", "2026-11-20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", hasItems(5, 6)));
    }

    @Test
    void in_pageWindow_out_slicedItemsAndRealTotal() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.total").value(5))
                .andExpect(jsonPath("$.total_pages").value(3));

        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("page", "2").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.page").value(2));

        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("page", "9").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.total").value(5))
                .andExpect(jsonPath("$.total_pages").value(3));
    }

    @Test
    void in_invalidPaging_out_invalidInput() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("size", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_detail_out_publisherAndParticipants() throws Exception {
        mockMvc.perform(get("/api/trips/3").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.status").value("recruiting"))
                .andExpect(jsonPath("$.publisher.id").value(2))
                .andExpect(jsonPath("$.participants", hasSize(1)))
                .andExpect(jsonPath("$.participants[0].id").value(2));
    }

    @Test
    void in_unknownTrip_out_tripNotFound() throws Exception {
        mockMvc.perform(get("/api/trips/9999").header("X-User-Id", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void in_listWithoutIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/trips"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_unsupportedSort_out_invalidInput() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("sort", "match"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_publisherCompletesTrip_out_completedStatus() throws Exception {
        mockMvc.perform(post("/api/trips/3/complete").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.completed_at").exists());
    }

    @Test
    void in_nonPublisherCompletesTrip_out_forbidden() throws Exception {
        mockMvc.perform(post("/api/trips/3/complete").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_alreadyCompletedTrip_out_tripNotOpen() throws Exception {
        mockMvc.perform(post("/api/trips/1/complete").header("X-User-Id", "1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_completeUnknownTrip_out_tripNotFound() throws Exception {
        mockMvc.perform(post("/api/trips/9999/complete").header("X-User-Id", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
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