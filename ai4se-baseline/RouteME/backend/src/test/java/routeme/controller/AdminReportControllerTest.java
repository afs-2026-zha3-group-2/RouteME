package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

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

/** Admin report queue: list/filter, context, start and resolve with the inline penalty. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class AdminReportControllerTest {

    private static final String FUTURE = "2027-01-01T00:00:00Z";
    private static final String PAST = "2026-01-01T00:00:00Z";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_adminList_out_pendingReportRow() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, "reporter note");

        mockMvc.perform(get("/api/admin/reports").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(reportId))
                .andExpect(jsonPath("$.items[0].code").value("R-" + reportId))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[0].target_type").value("user"))
                .andExpect(jsonPath("$.items[0].target_id").value(3))
                .andExpect(jsonPath("$.items[0].reason").value("safety"))
                .andExpect(jsonPath("$.items[0].reporter.id").value(1))
                .andExpect(jsonPath("$.items[0].reported_user.id").value(3))
                .andExpect(jsonPath("$.items[0].target_label").exists())
                .andExpect(jsonPath("$.items[0].note").doesNotExist());
    }

    @Test
    void in_statusFilter_out_onlyMatchingRows() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "trip", 1, null);
        start(admin, reportId).andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/reports")
                        .param("status", "PENDING")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        mockMvc.perform(get("/api/admin/reports")
                        .param("status", "PROCESSING")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(reportId));
    }

    @Test
    void in_detail_out_reportContext() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, "reporter note");

        mockMvc.perform(get("/api/admin/reports/" + reportId).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reportId))
                .andExpect(jsonPath("$.note").value("reporter note"))
                .andExpect(jsonPath("$.target.type").value("user"))
                .andExpect(jsonPath("$.target.id").value(3))
                .andExpect(jsonPath("$.target.exists").value(true))
                .andExpect(jsonPath("$.processed_by").doesNotExist())
                .andExpect(jsonPath("$.resolution_note").doesNotExist());
    }

    @Test
    void in_chatReport_out_chatTranscriptContext() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null, 4L);

        mockMvc.perform(get("/api/admin/reports/" + reportId).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context.origin").value("chat"))
                .andExpect(jsonPath("$.context.trip.id").value(4))
                .andExpect(jsonPath("$.context.trip.title").exists())
                .andExpect(jsonPath("$.context.trip.publisher.id").value(3))
                .andExpect(jsonPath("$.context.messages.length()").value(4))
                .andExpect(jsonPath("$.context.messages[0].sender.id").value(3))
                .andExpect(jsonPath("$.context.messages[0].receiver.id").value(1))
                .andExpect(jsonPath("$.context.messages[0].content").value("周六早上九点陈家祠地铁 D 口集合，可以吗？"))
                .andExpect(jsonPath("$.context.messages[0].sent_at").value("2026-11-12T09:12:00Z"));
    }

    @Test
    void in_tripReport_out_tripContextWithoutMessages() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "trip", 4, null);

        mockMvc.perform(get("/api/admin/reports/" + reportId).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context.origin").value("trip"))
                .andExpect(jsonPath("$.context.trip.id").value(4))
                .andExpect(jsonPath("$.context.trip.publisher.id").value(3))
                .andExpect(jsonPath("$.context.messages.length()").value(0));
    }

    @Test
    void in_unknownReport_out_reportNotFound() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(get("/api/admin/reports/999999").header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("REPORT_NOT_FOUND"));
    }

    @Test
    void in_start_out_processingWithOperator() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);

        start(admin, reportId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSING"))
                .andExpect(jsonPath("$.processed_by.id").value(userId(admin)))
                .andExpect(jsonPath("$.processing_at").value(FixedClockTestConfig.NOW.toString()));
    }

    @Test
    void in_startTwice_out_reportNotPending() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        start(admin, reportId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REPORT_NOT_PENDING"));
    }

    @Test
    void in_resolveKeep_out_resolvedWithoutPenalty() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"confirmed but no penalty","action":"KEEP"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolution_action").value("KEEP"))
                .andExpect(jsonPath("$.resolution_note").value("confirmed but no penalty"))
                .andExpect(jsonPath("$.resolved_at").value(FixedClockTestConfig.NOW.toString()));

        mockMvc.perform(get("/api/admin/users/3").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void in_resolveSuspend_out_suspendsReportedUserWithoutBanFields() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"confirmed suspension","action":"SUSPEND"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolution_action").value("SUSPEND"));

        mockMvc.perform(get("/api/admin/users/3").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"))
                .andExpect(jsonPath("$.status_reason").value("confirmed suspension"))
                .andExpect(jsonPath("$.ban_reason_code").doesNotExist());
    }

    @Test
    void in_resolveBan_out_bansReportedUser() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"confirmed","action":"BAN",
                 "ban_reason_code":"HARASSMENT","ban_expires_at":"%s"}
                """.formatted(FUTURE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolution_action").value("BAN"));

        mockMvc.perform(get("/api/admin/users/3").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BANNED"))
                .andExpect(jsonPath("$.ban_reason_code").value("HARASSMENT"))
                .andExpect(jsonPath("$.ban_expires_at").value(FUTURE));
    }

    @Test
    void in_resolveReject_out_rejectedWithFixedAction() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"REJECTED","note":"insufficient evidence","action":"BAN"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.resolution_action").value("REJECT"));

        mockMvc.perform(get("/api/admin/users/3").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void in_resolveWithoutStart_out_reportNotProcessing() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"skip","action":"KEEP"}
                """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REPORT_NOT_PROCESSING"));
    }

    @Test
    void in_resolveMissingNote_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","action":"KEEP"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_resolveBanOtherWithoutNote_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"other","action":"BAN",
                 "ban_reason_code":"OTHER","ban_expires_at":"%s"}
                """.formatted(FUTURE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_resolveBanPastExpiry_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", 3, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"past","action":"BAN",
                 "ban_reason_code":"HARASSMENT","ban_expires_at":"%s"}
                """.formatted(PAST))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_normalUser_out_adminRequired() throws Exception {
        String user = register("ReportViewer");

        mockMvc.perform(get("/api/admin/reports").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_REQUIRED"));
    }

    @Test
    void in_missingBearer_out_sessionInvalid() throws Exception {
        mockMvc.perform(get("/api/admin/reports"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    private org.springframework.test.web.servlet.ResultActions start(String admin, long reportId)
            throws Exception {
        return mockMvc.perform(post("/api/admin/reports/" + reportId + "/start")
                .header("Authorization", bearer(admin)));
    }

    private org.springframework.test.web.servlet.ResultActions resolve(
            String admin, long reportId, String body) throws Exception {
        return mockMvc.perform(post("/api/admin/reports/" + reportId + "/resolve")
                .header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private long submitReport(long reporterId, String targetType, long targetId, String note)
            throws Exception {
        return submitReport(reporterId, targetType, targetId, note, null);
    }

    private long submitReport(
            long reporterId, String targetType, long targetId, String note, Long tripId)
            throws Exception {
        String extra = (tripId == null ? "" : ",\"trip_id\":" + tripId)
                + (note == null ? "" : ",\"note\":\"" + note + "\"");
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", String.valueOf(reporterId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"target_type":"%s","target_id":%d,"reason":"safety"%s}
                                """.formatted(targetType, targetId, extra)))
                .andExpect(status().isCreated());
        return jdbcClient.sql("SELECT MAX(id) FROM reports").query(Long.class).single();
    }

    private String register(String nickname) throws Exception {
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"}
                """.formatted("r" + UUID.randomUUID().toString().replace("-", "").substring(0, 12), nickname);
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    private String login(String username, String password) throws Exception {
        String body = """
                {"username":"%s","password":"%s"}
                """.formatted(username, password);
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private static String bearer(String session) {
        return "Bearer " + JsonPath.read(session, "$.token");
    }

    private static long userId(String session) {
        Number id = JsonPath.read(session, "$.user.id");
        return id.longValue();
    }
}