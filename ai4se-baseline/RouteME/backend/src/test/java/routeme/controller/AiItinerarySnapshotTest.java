package routeme.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

/**
 * AI 行程快照（B7 / B8）：保存完整快照、归属校验、非法快照拒绝。
 * 快照链路不依赖 AI / 天气上游，无需替身。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class AiItinerarySnapshotTest {

    private static final String SNAPSHOT = """
            {
              "origin": { "name": "广州南站", "lng": 113.269, "lat": 22.989 },
              "destination": { "name": "广州市", "lng": 113.264, "lat": 23.129 },
              "date": "2026-11-21",
              "duration": "one_day",
              "travel_mode": "transit",
              "interests": ["美食", "摄影"],
              "pace": "moderate",
              "budget_cents": 50000,
              "stops": [
                { "name": "广州塔", "lng": 113.3245, "lat": 23.1064, "order": 1,
                  "reason": "城市地标", "arrival": "09:00", "stay_minutes": 120,
                  "indoor": false, "resolved": true },
                { "name": "海心沙", "lng": 113.3217, "lat": 23.1104, "order": 2,
                  "reason": "江景开阔", "arrival": "11:30", "stay_minutes": 60,
                  "indoor": false, "resolved": true }
              ],
              "route": { "mode": "transit", "distance_meters": 8200, "duration_seconds": 2700,
                         "legs": [ { "from_id": "poi-广州塔", "to_id": "poi-海心沙",
                                     "distance_meters": 8200, "duration_seconds": 2700 } ] },
              "weather": { "date": "2026-11-21", "temp_max_c": 24, "temp_min_c": 17,
                           "precipitation_probability_pct": 20, "precipitation_mm": 0.0,
                           "weather_code": 1, "weather_text": "多云", "wind_speed_kmh": 12.5,
                           "uv_index": 6.0, "source": "open-meteo" },
              "tips": ["当天紫外线较强，注意防晒"],
              "packing": ["防晒霜", "帽子", "饮用水"],
              "ai_budget": { "transport_cents": 8000, "tickets_cents": 15000,
                             "food_cents": 18000, "other_cents": 5000, "total_cents": 46000 }
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_completeSnapshot_out_savedAndReadableByOwner() throws Exception {
        int id = saveSnapshot(SNAPSHOT, "1");

        mockMvc.perform(get("/api/ai/itineraries/" + id).header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.origin.name").value("广州南站"))
                .andExpect(jsonPath("$.origin.lng").value(113.269))
                .andExpect(jsonPath("$.destination.name").value("广州市"))
                .andExpect(jsonPath("$.date").value("2026-11-21"))
                .andExpect(jsonPath("$.duration").value("one_day"))
                .andExpect(jsonPath("$.travel_mode").value("transit"))
                .andExpect(jsonPath("$.interests[0]").value("美食"))
                .andExpect(jsonPath("$.pace").value("moderate"))
                .andExpect(jsonPath("$.budget_cents").value(50000))
                .andExpect(jsonPath("$.stops[0].name").value("广州塔"))
                .andExpect(jsonPath("$.stops[0].lng").value(113.3245))
                .andExpect(jsonPath("$.stops[0].lat").value(23.1064))
                .andExpect(jsonPath("$.stops[0].order").value(1))
                .andExpect(jsonPath("$.stops[0].reason").value("城市地标"))
                .andExpect(jsonPath("$.stops[1].order").value(2))
                .andExpect(jsonPath("$.route.mode").value("transit"))
                .andExpect(jsonPath("$.route.distance_meters").value(8200))
                .andExpect(jsonPath("$.route.duration_seconds").value(2700))
                .andExpect(jsonPath("$.route.legs[0].from_id").value("poi-广州塔"))
                .andExpect(jsonPath("$.weather.temp_max_c").value(24))
                .andExpect(jsonPath("$.weather.weather_text").value("多云"))
                .andExpect(jsonPath("$.tips[0]").exists())
                .andExpect(jsonPath("$.packing[0]").value("防晒霜"))
                .andExpect(jsonPath("$.ai_budget.total_cents").value(46000));
    }

    @Test
    void in_otherUsersSnapshot_out_invalidInput() throws Exception {
        int id = saveSnapshot(SNAPSHOT, "1");

        mockMvc.perform(get("/api/ai/itineraries/" + id).header("X-User-Id", "2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_unknownSnapshot_out_invalidInput() throws Exception {
        mockMvc.perform(get("/api/ai/itineraries/9999").header("X-User-Id", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingDestination_out_invalidInputAndNoSnapshot() throws Exception {
        String body = SNAPSHOT.replace(
                "\"destination\": { \"name\": \"广州市\", \"lng\": 113.264, \"lat\": 23.129 },", "");
        postSnapshot(body, "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        assertNothingSaved();
    }

    @Test
    void in_missingDate_out_invalidInputAndNoSnapshot() throws Exception {
        String body = SNAPSHOT.replace("\"date\": \"2026-11-21\",", "");
        postSnapshot(body, "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        assertNothingSaved();
    }

    @Test
    void in_fewerThanTwoResolvedStops_out_invalidInput() throws Exception {
        // 两个 stop 全部未解析 → resolved=0 <2，同样命中「已解析景点不足」校验。
        String body = SNAPSHOT.replace("\"resolved\": true", "\"resolved\": false");
        postSnapshot(body, "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        assertNothingSaved();
    }

    @Test
    void in_resolvedStopWithoutCoordinates_out_invalidInput() throws Exception {
        String body = SNAPSHOT.replace("\"lng\": 113.3245, \"lat\": 23.1064, ", "");
        postSnapshot(body, "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        assertNothingSaved();
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        postSnapshot(SNAPSHOT, null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    /** 事务回滚口径下 id 从 1 起；非法保存后 GET /1 必须 400，证明没有落库。 */
    private void assertNothingSaved() throws Exception {
        mockMvc.perform(get("/api/ai/itineraries/1").header("X-User-Id", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    private int saveSnapshot(String body, String userId) throws Exception {
        String response = postSnapshot(body, userId)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private ResultActions postSnapshot(String body, String userId) throws Exception {
        var request = post("/api/ai/itineraries")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
        if (userId != null) {
            request.header("X-User-Id", userId);
        }
        return mockMvc.perform(request);
    }
}