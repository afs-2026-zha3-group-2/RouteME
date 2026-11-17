package routeme.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class TripCancellationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_recruitingTripByPublisher_out_cancelledWithReasonAndListExcluded() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"))
                .andExpect(jsonPath("$.cancelled_at").exists())
                .andExpect(jsonPath("$.cancel_reason").value("personal"));

        mockMvc.perform(get("/api/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", not(hasItem(5))));
        mockMvc.perform(get("/api/matches").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].trip.id", not(hasItem(5))));

        mockMvc.perform(get("/api/trips/5").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancel_reason").value("personal"));
        mockMvc.perform(get("/api/trips/5").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"))
                .andExpect(jsonPath("$.cancel_reason").doesNotExist())
                .andExpect(jsonPath("$.cancel_note").doesNotExist());

        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published[*].id", hasItem(5)));
    }

    @Test
    void in_fullTripByPublisher_out_acceptedRetainedAndChatReadOnly() throws Exception {
        mockMvc.perform(post("/api/trips/6/cancel")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"not_enough_people\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"))
                .andExpect(jsonPath("$.participants[*].id", hasItem(2)));

        assertEquals("ACCEPTED", applicationStatus(7), "accepted companion retained");
        assertEquals("2", joinedCount(6), "joined count unchanged");

        mockMvc.perform(get("/api/trips/6").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancel_reason").value("not_enough_people"));

        mockMvc.perform(post("/api/trips/6/messages")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":3,\"content\":\"还可以发吗\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHAT_READ_ONLY"));

        mockMvc.perform(post("/api/trips/6/experiences")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"取消后不应能发\",\"intensity\":\"relaxed\",\"advice\":\"无\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_NOT_ALLOWED"));

        mockMvc.perform(post("/api/applications/7/reject").header("X-User-Id", "3"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("APPLICATION_NOT_PENDING"));

        mockMvc.perform(post("/api/trips/6/leave")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched[*].id", hasItem(6)))
                .andExpect(jsonPath("$.completed[*].id", not(hasItem(6))));
    }

    @Test
    void in_pendingApplication_out_autoCancelledAndVisibleToApplicant() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"weather\"}"))
                .andExpect(status().isOk());

        assertEquals("CANCELLED", applicationStatus(6), "pending application auto cancelled");

        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied[?(@.id == 6)].status").value("cancelled"))
                .andExpect(jsonPath("$.applied[?(@.id == 6)].trip.status").value("cancelled"));
    }

    @Test
    void in_nonPublisher_out_forbiddenAndNoChange() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertNull(cancelledAt(5), "non-publisher must not write cancellation");
    }

    @Test
    void in_nonCancellableStatus_out_conflict() throws Exception {
        mockMvc.perform(post("/api/trips/3/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        mockMvc.perform(post("/api/trips/1/cancel")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_missingReason_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_otherReasonWithoutNote_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"other\",\"note\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"other\",\"note\":\"" + "说".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_otherReasonWithNote_out_cancelledWithNote() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"other\",\"note\":\"临时家里有事\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancel_reason").value("other"))
                .andExpect(jsonPath("$.cancel_note").value("临时家里有事"));
    }

    @Test
    void in_doubleCancel_out_secondConflictAndSingleWrite() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk());
        String firstCancelledAt = cancelledAt(5);
        assertNotNull(firstCancelledAt);

        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"safety\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        assertEquals(firstCancelledAt, cancelledAt(5), "cancellation written once");
    }

    @Test
    void in_cancelledTrip_out_applyAndMeetingEditRejected() throws Exception {
        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/trips/5/applications")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        mockMvc.perform(put("/api/trips/5/meeting")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meeting_areas\":[\"新地点\"],\"meeting_time\":\"2026-11-23T08:00\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_cancelledTrip_out_statsPublishedExcluded() throws Exception {
        mockMvc.perform(get("/api/users/2/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.published").value(3));

        mockMvc.perform(post("/api/trips/5/cancel")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/users/2/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.published").value(2));
    }

    @Test
    void in_cancelledExpiredTrip_out_notMaterialized() throws Exception {
        insertCancelledExpiredTrip(99);

        mockMvc.perform(get("/api/trips/99").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"));

        assertNull(completedAt(99), "cancelled trip must not be materialized");
    }

    private String applicationStatus(long applicationId) {
        return jdbcClient.sql("SELECT status FROM trip_applications WHERE id = :id")
                .param("id", applicationId)
                .query(String.class)
                .single();
    }

    private String joinedCount(long tripId) {
        return jdbcClient.sql("SELECT joined_count FROM trip_plans WHERE id = :id")
                .param("id", tripId)
                .query(Integer.class)
                .single()
                .toString();
    }

    private String cancelledAt(long tripId) {
        return jdbcClient.sql("SELECT cancelled_at FROM trip_plans WHERE id = :id")
                .param("id", tripId)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    private String completedAt(long tripId) {
        return jdbcClient.sql("SELECT completed_at FROM trip_plans WHERE id = :id")
                .param("id", tripId)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    private void insertCancelledExpiredTrip(long id) {
        jdbcClient.sql("""
                        INSERT INTO trip_plans
                            (id, publisher_id, title, destination, destination_code, start_date, end_date,
                             stops, meeting_areas, note, budget_min_cents, budget_max_cents, tags,
                             capacity, joined_count, completed_at, cancelled_at, cancel_reason, created_at, updated_at)
                        VALUES
                            (:id, 1, :title, '珠海市', '440400', '2026-11-14', '2026-11-15',
                             '["香洲港","情侣路"]', NULL, NULL, NULL, NULL, '[]',
                             3, 1, NULL, '2026-11-14T00:00:00Z', 'personal',
                             '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z')
                        """)
                .param("id", id)
                .param("title", "已取消且到期 " + id)
                .update();
    }
}
