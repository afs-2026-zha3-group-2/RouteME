package routeme.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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

import routeme.config.FixedClockTestConfig;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TripCompletionApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_ongoingTripByPublisher_out_completedAndPendingCancelled() throws Exception {
        mockMvc.perform(post("/api/trips/3/complete").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.completed_at").exists());

        assertEquals("CANCELLED", applicationStatus(4), "pending application auto cancelled");
    }

    @Test
    void in_nonPublisher_out_forbidden() throws Exception {
        mockMvc.perform(post("/api/trips/3/complete").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_recruitingTrip_out_tripNotOpen() throws Exception {
        mockMvc.perform(post("/api/trips/5/complete").header("X-User-Id", "2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_fullTrip_out_tripNotOpen() throws Exception {
        mockMvc.perform(post("/api/trips/6/complete").header("X-User-Id", "3"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_completedTrip_out_tripNotOpen() throws Exception {
        mockMvc.perform(post("/api/trips/1/complete").header("X-User-Id", "1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_ongoingTrip_out_applicationStillAllowed() throws Exception {
        mockMvc.perform(post("/api/trips/4/applications")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.trip.status").value("ongoing"));
    }

    @Test
    void in_fullTrip_out_acceptRejectedButRejectAllowed() throws Exception {
        insertPendingApplication(100, 6, 1);

        mockMvc.perform(post("/api/applications/100/accept").header("X-User-Id", "3"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        mockMvc.perform(post("/api/applications/100/reject").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"));
    }

    @Test
    void in_expiredTrip_out_materializedToListAndStats() throws Exception {
        insertTrip(99, LocalDate.of(2026, 11, 14), LocalDate.of(2026, 11, 15));
        insertPendingApplication(101, 99, 2);

        mockMvc.perform(get("/api/trips/99").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.completed_at").value("2026-11-15T16:00:00Z"));

        assertEquals("CANCELLED", applicationStatus(101), "pending application auto cancelled");

        mockMvc.perform(get("/api/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", not(hasItem(99))));

        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed[*].id", hasItem(99)));

        mockMvc.perform(get("/api/users/1/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.completed").value(2));
    }

    @Test
    void in_stalePageApply_out_rejectedAfterMaterialization() throws Exception {
        insertTrip(98, LocalDate.of(2026, 11, 14), LocalDate.of(2026, 11, 15));

        mockMvc.perform(post("/api/trips/98/applications")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        String completedAt = jdbcClient.sql("SELECT completed_at FROM trip_plans WHERE id = 98")
                .query(String.class)
                .single();
        assertNotNull(completedAt, "expired trip materialized before rejecting");
        assertEquals("2026-11-15T16:00:00Z", completedAt);
    }

    @Test
    void in_endingWindow_out_endingSoonFlag() throws Exception {
        mockMvc.perform(get("/api/trips/3").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ending_soon").value(false));
    }

    private String applicationStatus(long applicationId) {
        return jdbcClient.sql("SELECT status FROM trip_applications WHERE id = :id")
                .param("id", applicationId)
                .query(String.class)
                .single();
    }

    private void insertTrip(long id, LocalDate start, LocalDate end) {
        jdbcClient.sql("""
                        INSERT INTO trip_plans
                            (id, publisher_id, title, destination, destination_code, start_date, end_date,
                             stops, meeting_areas, note, budget_min_cents, budget_max_cents, tags,
                             capacity, joined_count, completed_at, created_at, updated_at)
                        VALUES
                            (:id, 1, :title, '珠海市', '440400', :start, :end,
                             '["香洲港","情侣路"]', NULL, NULL, NULL, NULL, '[]',
                             3, 1, NULL, '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z')
                        """)
                .param("id", id)
                .param("title", "到期自动完成测试 " + id)
                .param("start", start.toString())
                .param("end", end.toString())
                .update();
    }

    private void insertPendingApplication(long id, long tripId, long applicantId) {
        jdbcClient.sql("""
                        INSERT INTO trip_applications
                            (id, trip_id, applicant_id, message, status, created_at, decided_at)
                        VALUES
                            (:id, :tripId, :applicantId, NULL, 'PENDING', '2026-11-16T00:00:00Z', NULL)
                        """)
                .param("id", id)
                .param("tripId", tripId)
                .param("applicantId", applicantId)
                .update();
    }
}
