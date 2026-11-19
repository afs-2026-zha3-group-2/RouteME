package routeme.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;

/**
 * 发布者编辑途经点：PUT /api/trips/{tripId}/stops。
 * 种子行程 6 为满员（发布者 3、已接受同行者 2，V39 已回填群消息），
 * 行程 5 招募中（发布者 2），行程 4 进行中，行程 1 已结束。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TripRouteUpdateApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_fullTripPublisher_out_stopsCleanedAndCompanionNotified() throws Exception {
        mockMvc.perform(put("/api/trips/6/stops")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\" 祖庙地铁站集合 \",\"祖庙\",\"岭南天地\",\"梁园\",\"甜品店收尾\",\"祖庙\",\"  \"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stops", hasSize(5)))
                .andExpect(jsonPath("$.stops[0]").value("祖庙地铁站集合"))
                .andExpect(jsonPath("$.stops[4]").value("甜品店收尾"))
                .andExpect(jsonPath("$.group_open").value(true));

        Integer notified = jdbcClient.sql("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = 2 AND event = 'trip_route_updated' AND trip_id = 6
                """).query(Integer.class).single();
        assertEquals(1, notified, "accepted companion gets the route update notification");

        mockMvc.perform(get("/api/trips/6/group-messages").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].sender.id").value(3))
                .andExpect(jsonPath("$[1].content")
                        .value("路线已更新：祖庙地铁站集合 → 祖庙 → 岭南天地 → 梁园 → 甜品店收尾"));
    }

    @Test
    void in_repeatedEditAtSameInstant_out_notificationDeduped() throws Exception {
        String body = "{\"stops\":[\"祖庙地铁站集合\",\"祖庙\",\"岭南天地\"]}";
        mockMvc.perform(put("/api/trips/6/stops")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/trips/6/stops")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        Integer notified = jdbcClient.sql("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = 2 AND event = 'trip_route_updated' AND trip_id = 6
                """).query(Integer.class).single();
        assertEquals(1, notified, "same updatedAt millisecond dedupes the route notification");
    }

    @Test
    void in_recruitingTrip_out_updatedWithoutGroupMessage() throws Exception {
        mockMvc.perform(put("/api/trips/5/stops")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"大鹏所城集合\",\"较场尾民宿休整\",\"杨梅坑骑行\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stops", hasSize(3)))
                .andExpect(jsonPath("$.group_open").value(false));

        mockMvc.perform(get("/api/trips/5/group-messages").header("X-User-Id", "2"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void in_nonPublisher_out_forbidden() throws Exception {
        mockMvc.perform(put("/api/trips/6/stops")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"祖庙\",\"岭南天地\"]}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_ongoingTrip_out_tripNotOpen() throws Exception {
        mockMvc.perform(put("/api/trips/4/stops")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"陈家祠地铁站集合\",\"恩宁路骑楼\"]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_completedTrip_out_tripNotOpen() throws Exception {
        mockMvc.perform(put("/api/trips/1/stops")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"香洲港集合\",\"情侣路骑行段\"]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_cancelledTrip_out_tripNotOpen() throws Exception {
        jdbcClient.sql("UPDATE trip_plans SET cancelled_at = '2026-11-15T09:00:00Z' WHERE id = 6")
                .update();
        mockMvc.perform(put("/api/trips/6/stops")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"祖庙\",\"岭南天地\"]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_tooFewStops_out_invalidInput() throws Exception {
        mockMvc.perform(put("/api/trips/6/stops")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"只剩一站\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        mockMvc.perform(put("/api/trips/6/stops")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"  \",\"同一站\",\"同一站\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(put("/api/trips/6/stops")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stops\":[\"祖庙\",\"岭南天地\"]}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }
}