package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

/**
 * 路线完成度最小闭环：发布者结束行程时声明实际完成的途经点，同事务落库；
 * 个人主页按途经点加权聚合（Σ完成点数 / Σ计划点数），阈值口径复用 RouteCompletionPolicy。
 * 到期自动完成不产生声明，不计入样本。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TripRouteCompletionApiTest {

    private static final long PUBLISHER = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_partialCompletion_out_watchRateAndDeclarationRow() throws Exception {
        long tripId = createOngoingTrip();

        complete(tripId, "{\"completed_stop_indexes\":[0]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"));

        mockMvc.perform(get("/api/users/{userId}/profile", PUBLISHER).header("X-User-Id", PUBLISHER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("watch"))
                .andExpect(jsonPath("$.route_completion_rate").value(50));

        assertEquals("[0]", declarationIndexes(tripId), "declaration stores the checked indexes");
        assertEquals(2, declarationPlannedCount(tripId), "declaration snapshots the planned stop count");
    }

    @Test
    void in_twoTripsWeighted_out_neutralRate() throws Exception {
        long first = createOngoingTrip();
        long second = createOngoingTrip();

        complete(first, "{\"completed_stop_indexes\":[0]}").andExpect(status().isOk());
        complete(second, null).andExpect(status().isOk());

        // (1 + 2) / (2 + 2) = 75% → neutral。
        mockMvc.perform(get("/api/users/{userId}/profile", PUBLISHER).header("X-User-Id", PUBLISHER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("neutral"))
                .andExpect(jsonPath("$.route_completion_rate").value(75));
    }

    @Test
    void in_completeWithoutBody_out_allCompletedGood() throws Exception {
        long tripId = createOngoingTrip();

        complete(tripId, null).andExpect(status().isOk());

        mockMvc.perform(get("/api/users/{userId}/profile", PUBLISHER).header("X-User-Id", PUBLISHER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("good"))
                .andExpect(jsonPath("$.route_completion_rate").value(100));
        assertEquals("[0,1]", declarationIndexes(tripId), "missing body means all stops completed");
    }

    @Test
    void in_emptyIndexes_out_zeroRateWatch() throws Exception {
        long tripId = createOngoingTrip();

        complete(tripId, "{\"completed_stop_indexes\":[]}").andExpect(status().isOk());

        mockMvc.perform(get("/api/users/{userId}/profile", PUBLISHER).header("X-User-Id", PUBLISHER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("watch"))
                .andExpect(jsonPath("$.route_completion_rate").value(0));
    }

    @Test
    void in_illegalIndexes_out_badRequestAndTripUntouched() throws Exception {
        long tripId = createOngoingTrip();

        for (String body : new String[] {
                "{\"completed_stop_indexes\":[2]}",
                "{\"completed_stop_indexes\":[-1]}",
                "{\"completed_stop_indexes\":[0,0]}",
                "{\"completed_stop_indexes\":[null]}"}) {
            complete(tripId, body)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        assertNull(completedAt(tripId), "invalid indexes must not write completed_at");
        assertEquals(0, declarationCount(tripId), "invalid indexes write no declaration");
        assertEquals("ongoing", tripStatus(tripId), "trip stays ongoing after rejected declarations");
    }

    @Test
    void in_completeTwice_out_secondConflictAndSingleDeclaration() throws Exception {
        long tripId = createOngoingTrip();

        complete(tripId, "{\"completed_stop_indexes\":[0]}").andExpect(status().isOk());
        complete(tripId, "{\"completed_stop_indexes\":[0,1]}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        assertEquals(1, declarationCount(tripId), "declaration is immutable after completion");
        assertEquals("[0]", declarationIndexes(tripId), "second attempt does not overwrite the declaration");
    }

    @Test
    void in_expiredAutoComplete_out_noDeclarationSample() throws Exception {
        long tripId = 97;
        insertExpiredTrip(tripId);

        mockMvc.perform(get("/api/trips/{tripId}", tripId).header("X-User-Id", PUBLISHER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"));

        assertEquals(0, declarationCount(tripId), "auto materialization writes no declaration");
        mockMvc.perform(get("/api/users/{userId}/profile", PUBLISHER).header("X-User-Id", PUBLISHER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("insufficient"))
                .andExpect(jsonPath("$.route_completion_rate").doesNotExist());
    }

    private org.springframework.test.web.servlet.ResultActions complete(long tripId, String body) throws Exception {
        var request = post("/api/trips/{tripId}/complete", tripId).header("X-User-Id", PUBLISHER);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mockMvc.perform(request);
    }

    private long createOngoingTrip() throws Exception {
        String body = """
                {
                  "title": "完成度闭环测试",
                  "destination_code": "440400",
                  "start_date": "2026-11-16",
                  "end_date": "2026-11-16",
                  "stops": ["香洲港集合", "情侣路骑行"],
                  "capacity": 4
                }
                """;
        String response = mockMvc.perform(post("/api/trips")
                        .header("X-User-Id", PUBLISHER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ongoing"))
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(response, "$.id");
        return id.longValue();
    }

    private void insertExpiredTrip(long tripId) {
        jdbcClient.sql("""
                        INSERT INTO trip_plans
                            (id, publisher_id, title, destination, destination_code, start_date, end_date,
                             stops, tags, capacity, joined_count, completed_at, created_at, updated_at)
                        VALUES
                            (:id, :publisher, '到期自动完成', '珠海市', '440400', :start, :end,
                             '["香洲港","情侣路"]', '[]', 3, 1, NULL,
                             '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z')
                        """)
                .param("id", tripId)
                .param("publisher", PUBLISHER)
                .param("start", LocalDate.of(2026, 11, 14).toString())
                .param("end", LocalDate.of(2026, 11, 15).toString())
                .update();
    }

    private String tripStatus(long tripId) throws Exception {
        String response = mockMvc.perform(get("/api/trips/{tripId}", tripId).header("X-User-Id", PUBLISHER))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.status");
    }

    private String completedAt(long tripId) {
        return jdbcClient.sql("SELECT completed_at FROM trip_plans WHERE id = :id")
                .param("id", tripId)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    private int declarationCount(long tripId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM trip_route_completions WHERE trip_id = :id")
                .param("id", tripId)
                .query(Integer.class)
                .single();
    }

    private String declarationIndexes(long tripId) {
        return jdbcClient.sql("SELECT completed_stop_indexes FROM trip_route_completions WHERE trip_id = :id")
                .param("id", tripId)
                .query(String.class)
                .single();
    }

    private int declarationPlannedCount(long tripId) {
        return jdbcClient.sql("SELECT planned_stop_count FROM trip_route_completions WHERE trip_id = :id")
                .param("id", tripId)
                .query(Integer.class)
                .single();
    }
}