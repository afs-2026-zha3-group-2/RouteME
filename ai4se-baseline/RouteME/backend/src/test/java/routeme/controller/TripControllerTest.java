package routeme.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TripControllerTest {

    private static final String VALID_TRIP = """
            {
              "title": "广州老城骑楼扫街半日",
              "destination_code": "440100",
              "start_date": "2026-11-20",
              "end_date": "2026-11-20",
              "stops": ["陈家祠地铁站集合", "永庆坊"],
              "meeting_areas": ["陈家祠地铁站 D 口"],
              "budget_min_cents": 8000,
              "budget_max_cents": 15000,
              "tags": ["摄影", "历史"],
              "capacity": 4,
              "note": "走街串巷为主。"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

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
                .andExpect(jsonPath("$.destination").value("广州市"))
                .andExpect(jsonPath("$.destination_code").value("440100"))
                .andExpect(jsonPath("$.province_code").value("440000"))
                .andExpect(jsonPath("$.province_name").value("广东省"))
                .andExpect(jsonPath("$.budget_max_cents").value(15000));
    }

    @Test
    void in_destinationCodeOutsideLegacyCatalog_out_created() throws Exception {
        String body = VALID_TRIP.replace("\"destination_code\": \"440100\"", "\"destination_code\": \"350200\"");
        postTrip(body, "1").andExpect(status().isCreated())
                .andExpect(jsonPath("$.destination").value("厦门市"))
                .andExpect(jsonPath("$.destination_code").value("350200"))
                .andExpect(jsonPath("$.province_name").value("福建省"));
    }

    @Test
    void in_provinceCodeOnly_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"destination_code\": \"440100\"", "\"destination_code\": \"440000\"");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_unknownDestinationCode_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"destination_code\": \"440100\"", "\"destination_code\": \"999999\"");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingDestinationCode_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"destination_code\": \"440100\",", "");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingTitle_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace("\"广州老城骑楼扫街半日\"", "\"  \"");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_meetingTimeProvided_out_savedInDetailAndSummary() throws Exception {
        String body = withMeetingTime("2026-11-20T08:30");
        postTrip(body, "1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.meeting_areas[0]").value("陈家祠地铁站 D 口"))
                .andExpect(jsonPath("$.meeting_time").value("2026-11-20T08:30"));

        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published[0].meeting_areas[0]").value("陈家祠地铁站 D 口"))
                .andExpect(jsonPath("$.published[0].meeting_time").value("2026-11-20T08:30"));
    }

    @Test
    void in_meetingTimeAfterEndDate_out_invalidInput() throws Exception {
        postTrip(withMeetingTime("2026-11-21T08:30"), "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_meetingTimeUnparsable_out_invalidInput() throws Exception {
        postTrip(withMeetingTime("2026-11-20 08:30"), "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_publisherUpdatesMeeting_out_updated() throws Exception {
        mockMvc.perform(put("/api/trips/3/meeting")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meeting_areas\":[\"珠海渔女雕像\"],\"meeting_time\":\"2026-11-16T17:30\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meeting_areas[0]").value("珠海渔女雕像"))
                .andExpect(jsonPath("$.meeting_time").value("2026-11-16T17:30"))
                .andExpect(jsonPath("$.title").value("珠海情侣路日落机位二刷"));
    }

    @Test
    void in_clearMeeting_out_nullFields() throws Exception {
        mockMvc.perform(put("/api/trips/3/meeting")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meeting_areas.length()").value(0))
                .andExpect(jsonPath("$.meeting_time").value(nullValue()));
    }

    @Test
    void in_nonPublisherUpdatesMeeting_out_forbidden() throws Exception {
        mockMvc.perform(put("/api/trips/3/meeting")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meeting_areas\":[\"冒充\"]}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_completedTripUpdatesMeeting_out_notOpen() throws Exception {
        mockMvc.perform(put("/api/trips/1/meeting")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meeting_areas\":[\"改不了\"]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_meetingTimeAfterEndDateOnUpdate_out_invalidInput() throws Exception {
        mockMvc.perform(put("/api/trips/3/meeting")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meeting_time\":\"2026-11-17T08:00\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    private String withMeetingTime(String meetingTime) {
        return VALID_TRIP.replace(
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],",
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],\n  \"meeting_time\": \"" + meetingTime + "\",");
    }

    @Test
    void in_moreThanOneMeetingArea_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace(
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],",
                "\"meeting_areas\": [\"a\", \"b\"],");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_meetingAreaTooLong_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace(
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],",
                "\"meeting_areas\": [\"" + "长".repeat(101) + "\"],");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_duplicateMeetingAreas_out_trimmedAndDeduped() throws Exception {
        String body = VALID_TRIP.replace(
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],",
                "\"meeting_areas\": [\"陈家祠\", \"　陈家祠　\"],");
        postTrip(body, "1").andExpect(status().isCreated())
                .andExpect(jsonPath("$.meeting_areas.length()").value(1))
                .andExpect(jsonPath("$.meeting_areas[0]").value("陈家祠"));
    }

    @Test
    void in_travelModeProvided_out_savedInDetailAndSummary() throws Exception {
        String body = VALID_TRIP.replace(
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],",
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],\n  \"travel_mode\": \"bicycling\",");
        postTrip(body, "1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.travel_mode").value("bicycling"));

        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published[0].travel_mode").value("bicycling"));
    }

    @Test
    void in_noTravelMode_out_null() throws Exception {
        postTrip(VALID_TRIP, "1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.travel_mode").value(nullValue()));
    }

    @Test
    void in_unknownTravelMode_out_invalidInput() throws Exception {
        String body = VALID_TRIP.replace(
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],",
                "\"meeting_areas\": [\"陈家祠地铁站 D 口\"],\n  \"travel_mode\": \"teleport\",");
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
    void in_capacityZero_out_invalidInput() throws Exception {
        // 前端未选人数时 Number('') 会落到 0：后端必须拒绝，不能落库。
        String body = VALID_TRIP.replace("\"capacity\": 4", "\"capacity\": 0");
        postTrip(body, "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_capacityMissing_out_invalidInput() throws Exception {
        // capacity 缺失按 null 处理（TripPlan.create 归一为 0），同样要被拦下。
        String body = VALID_TRIP.replace("\"capacity\": 4,\n", "");
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
    void in_demoUsersEndpoint_out_demoAccountsPlusSeededAdmin() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].nickname").value("林见夏"))
                .andExpect(jsonPath("$[0].avatar_initial").value("夏"))
                .andExpect(jsonPath("$[0].role").value("USER"))
                .andExpect(jsonPath("$[4].role").value("ADMIN"))
                .andExpect(jsonPath("$[4].nickname").value("平台管理员"));
    }

    @Test
    void in_defaultList_out_unfinishedTripsOnly() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.total_pages", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.items[*].id", hasItems(3, 4, 5, 6)))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(1))))
                .andExpect(jsonPath("$.items[*].status", not(hasItem("completed"))))
                .andExpect(jsonPath("$.items[0].start_date").exists())
                .andExpect(jsonPath("$.items[0].publisher.nickname").exists());
    }

    @Test
    void in_filters_out_matchingTrips() throws Exception {
        mockMvc.perform(get("/api/trips").header("X-User-Id", "1").param("destination_code", "440400"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].destination").value("珠海市"))
                .andExpect(jsonPath("$.items[0].destination_code").value("440400"))
                .andExpect(jsonPath("$.items[0].province_name").value("广东省"));

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
                .andExpect(jsonPath("$.status").value("ongoing"))
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

    @Test
    void in_suspendedPublisher_out_accountSuspendedAndNoNewTrip() throws Exception {
        jdbcClient.sql("UPDATE app_users SET status = 'SUSPENDED' WHERE id = 2").update();
        Integer before = jdbcClient.sql("SELECT COUNT(*) FROM trip_plans")
                .query(Integer.class)
                .single();

        postTrip(VALID_TRIP, "2").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        Integer after = jdbcClient.sql("SELECT COUNT(*) FROM trip_plans")
                .query(Integer.class)
                .single();
        assertEquals(before, after, "suspended publisher writes no trip row");
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

    /* ---------- AI 行程链接（B9 / B10，add-ai-itinerary） ---------- */

    private static final String AI_SNAPSHOT = """
            {
              "origin": { "name": "广州南站", "lng": 113.269, "lat": 22.989 },
              "destination": { "name": "广州市", "lng": 113.264, "lat": 23.129 },
              "date": "2026-11-21",
              "duration": "one_day",
              "travel_mode": "transit",
              "interests": ["美食"],
              "pace": "moderate",
              "budget_cents": 50000,
              "stops": [
                { "name": "广州塔", "lng": 113.3245, "lat": 23.1064, "order": 1,
                  "reason": "地标", "arrival": "09:00", "stay_minutes": 120,
                  "indoor": false, "resolved": true },
                { "name": "海心沙", "lng": 113.3217, "lat": 23.1104, "order": 2,
                  "reason": "江景", "arrival": "11:30", "stay_minutes": 60,
                  "indoor": false, "resolved": true }
              ],
              "route": null,
              "weather": null,
              "tips": [],
              "packing": [],
              "ai_budget": { "transport_cents": 8000, "tickets_cents": 15000,
                             "food_cents": 18000, "other_cents": 5000, "total_cents": 46000 }
            }
            """;

    @Test
    void in_ownAiItineraryLink_out_idInDetailAndSummary() throws Exception {
        int snapshotId = saveAiSnapshot("1");
        String body = withAiLink(VALID_TRIP, snapshotId);

        String response = postTrip(body, "1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("recruiting"))
                .andExpect(jsonPath("$.ai_itinerary_id").value(snapshotId))
                .andReturn().getResponse().getContentAsString();
        int tripId = JsonPath.read(response, "$.id");

        mockMvc.perform(get("/api/trips/" + tripId).header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ai_itinerary_id").value(snapshotId));
        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published[0].ai_itinerary_id").value(snapshotId));
    }

    @Test
    void in_otherUsersAiLink_out_invalidInput() throws Exception {
        int snapshotId = saveAiSnapshot("2");
        postTrip(withAiLink(VALID_TRIP, snapshotId), "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_unknownAiLink_out_invalidInput() throws Exception {
        postTrip(withAiLink(VALID_TRIP, 9999), "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_plainPublish_out_nullAiLink() throws Exception {
        postTrip(VALID_TRIP, "1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ai_itinerary_id").value(nullValue()));
    }

    private String withAiLink(String tripBody, int snapshotId) {
        return tripBody.replace("\"capacity\": 4,", "\"capacity\": 4,\n  \"ai_itinerary_id\": " + snapshotId + ",");
    }

    private int saveAiSnapshot(String userId) throws Exception {
        String response = mockMvc.perform(post("/api/ai/itineraries")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AI_SNAPSHOT))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }
}