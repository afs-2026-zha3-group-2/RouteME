package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

/** Admin report queue: list/filter, context, start, and resolve with report-driven credit deduction. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class AdminReportControllerTest {

    private static final long REPORTED_USER = 3L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @BeforeEach
    void resetCreditState() {
        jdbcClient.sql("DELETE FROM credit_ledger WHERE user_id = :id")
                .param("id", REPORTED_USER).update();
        jdbcClient.sql("DELETE FROM credit_restriction WHERE user_id = :id")
                .param("id", REPORTED_USER).update();
        jdbcClient.sql("DELETE FROM user_credit_account WHERE user_id = :id")
                .param("id", REPORTED_USER).update();
    }

    @Test
    void in_adminList_out_pendingReportRowWithCreditSnapshot() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, "reporter note");

        mockMvc.perform(get("/api/admin/reports").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(reportId))
                .andExpect(jsonPath("$.items[0].code").value("R-" + reportId))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[0].target_type").value("user"))
                .andExpect(jsonPath("$.items[0].target_id").value(REPORTED_USER))
                .andExpect(jsonPath("$.items[0].reason").value("safety"))
                .andExpect(jsonPath("$.items[0].reporter.id").value(1))
                .andExpect(jsonPath("$.items[0].reported_user.id").value(REPORTED_USER))
                .andExpect(jsonPath("$.items[0].reported_user.credit_score").value(80))
                .andExpect(jsonPath("$.items[0].reported_user.credit_level").value("good"))
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
    void in_detail_out_reportContextAndCredit() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, "reporter note");

        mockMvc.perform(get("/api/admin/reports/" + reportId).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reportId))
                .andExpect(jsonPath("$.note").value("reporter note"))
                .andExpect(jsonPath("$.target.type").value("user"))
                .andExpect(jsonPath("$.target.id").value(REPORTED_USER))
                .andExpect(jsonPath("$.target.exists").value(true))
                .andExpect(jsonPath("$.reported_user.credit_score").value(80))
                .andExpect(jsonPath("$.reported_user.credit_level").value("good"))
                .andExpect(jsonPath("$.processed_by").doesNotExist())
                .andExpect(jsonPath("$.resolution_note").doesNotExist())
                .andExpect(jsonPath("$.violation_type").doesNotExist())
                .andExpect(jsonPath("$.applied_deduction").doesNotExist());
    }

    @Test
    void in_chatReport_out_chatTranscriptContext() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null, 4L);

        mockMvc.perform(get("/api/admin/reports/" + reportId).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context.origin").value("chat"))
                .andExpect(jsonPath("$.context.trip.id").value(4))
                .andExpect(jsonPath("$.context.trip.title").exists())
                .andExpect(jsonPath("$.context.trip.publisher.id").value(REPORTED_USER))
                .andExpect(jsonPath("$.context.messages.length()").value(4));
    }

    @Test
    void in_tripReport_out_tripContextWithoutMessages() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "trip", 4, null);

        mockMvc.perform(get("/api/admin/reports/" + reportId).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context.origin").value("trip"))
                .andExpect(jsonPath("$.context.trip.id").value(4))
                .andExpect(jsonPath("$.context.trip.publisher.id").value(REPORTED_USER))
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
        long reportId = submitReport(1, "user", REPORTED_USER, null);

        start(admin, reportId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSING"))
                .andExpect(jsonPath("$.processed_by.id").value(userId(admin)))
                .andExpect(jsonPath("$.processing_at").value(FixedClockTestConfig.NOW.toString()));
    }

    @Test
    void in_startTwice_out_reportNotPending() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        start(admin, reportId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REPORT_NOT_PENDING"));
    }

    @Test
    void in_resolveHarassment_out_deductsTenAndWritesLedger() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"confirmed harassment","violation_type":"HARASSMENT"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.violation_type").value("HARASSMENT"))
                .andExpect(jsonPath("$.applied_deduction").value(10))
                .andExpect(jsonPath("$.resolution_note").value("confirmed harassment"))
                .andExpect(jsonPath("$.resolution_action").doesNotExist())
                .andExpect(jsonPath("$.reported_user.credit_score").value(70))
                .andExpect(jsonPath("$.reported_user.credit_level").value("fair"));

        assertLedger(reportId, -10, 80, 70);
    }

    @Test
    void in_resolveFakeTrip_out_deductsFifteen() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"fake trip","violation_type":"FAKE_TRIP"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied_deduction").value(15))
                .andExpect(jsonPath("$.reported_user.credit_score").value(65));

        assertLedger(reportId, -15, 80, 65);
    }

    @Test
    void in_resolveOther_out_usesSelectedTier() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"other","violation_type":"OTHER","other_deduction":20}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.violation_type").value("OTHER"))
                .andExpect(jsonPath("$.applied_deduction").value(20))
                .andExpect(jsonPath("$.reported_user.credit_score").value(60));

        assertLedger(reportId, -20, 80, 60);
    }

    @Test
    void in_resolveOtherWithoutTier_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"other","violation_type":"OTHER"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        assertNoLedger(reportId);
        assertReportProcessing(reportId);
    }

    @Test
    void in_resolveMissingViolationType_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"missing type"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        assertNoLedger(reportId);
    }

    @Test
    void in_resolveUnknownViolationType_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"unknown","violation_type":"SPAM"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        assertNoLedger(reportId);
    }

    @Test
    void in_resolveRejected_out_noDeduction() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"REJECTED","note":"insufficient evidence"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.resolution_action").value("REJECT"))
                .andExpect(jsonPath("$.violation_type").doesNotExist())
                .andExpect(jsonPath("$.applied_deduction").doesNotExist())
                .andExpect(jsonPath("$.reported_user.credit_score").value(80));

        assertNoLedger(reportId);
    }

    @Test
    void in_resolveTwice_out_conflictAndSingleLedger() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());
        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"first","violation_type":"HARASSMENT"}
                """).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"second","violation_type":"FRAUD_RISK"}
                """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REPORT_NOT_PROCESSING"));

        assertLedgerCount(reportId, 1);
        assertScore(REPORTED_USER, 70);
    }

    @Test
    void in_resolveZeroScore_out_appliedZeroAndKeepsLedger() throws Exception {
        String admin = login("admin", "admin12345");
        setScore(REPORTED_USER, 0);
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"zero score","violation_type":"NO_SHOW_DISRUPTION"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied_deduction").value(0))
                .andExpect(jsonPath("$.reported_user.credit_score").value(0));

        assertLedger(reportId, 0, 0, 0);
    }

    @Test
    void in_resolveWithoutAccount_out_createsInitialEighty() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"no account","violation_type":"FAKE_TRIP"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reported_user.credit_score").value(65));

        assertLedger(reportId, -15, 80, 65);
    }

    @Test
    void in_resolveBelowSixty_out_createsRestriction() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"fraud","violation_type":"FRAUD_RISK"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reported_user.credit_score").value(50));

        Integer active = jdbcClient.sql(
                        "SELECT COUNT(*) FROM credit_restriction WHERE user_id = :id AND active_flag = 1")
                .param("id", REPORTED_USER).query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(active).isEqualTo(1);
        String reason = jdbcClient.sql(
                        "SELECT trigger_reason FROM credit_restriction WHERE user_id = :id AND active_flag = 1")
                .param("id", REPORTED_USER).query(String.class).single();
        org.assertj.core.api.Assertions.assertThat(reason).isEqualTo("CREDIT_SCORE_BELOW_60");
    }

    @Test
    void in_resolveExactlySixty_out_noRestriction() throws Exception {
        String admin = login("admin", "admin12345");
        setScore(REPORTED_USER, 70);
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"harassment","violation_type":"HARASSMENT"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reported_user.credit_score").value(60));

        Integer active = jdbcClient.sql(
                        "SELECT COUNT(*) FROM credit_restriction WHERE user_id = :id AND active_flag = 1")
                .param("id", REPORTED_USER).query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(active).isZero();
    }

    @Test
    void in_resolveActiveUser_out_statusUnchanged() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"harassment","violation_type":"HARASSMENT"}
                """).andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/users/" + REPORTED_USER).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void in_resolveWithLegacyActionFields_out_ignoresThem() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"legacy fields","violation_type":"HARASSMENT",
                 "action":"BAN","ban_reason_code":"HARASSMENT","ban_expires_at":"2027-01-01T00:00:00Z"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied_deduction").value(10));

        mockMvc.perform(get("/api/admin/users/" + REPORTED_USER).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ban_reason_code").doesNotExist());
    }

    @Test
    void in_resolveWithoutStart_out_reportNotProcessing() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","note":"skip","violation_type":"HARASSMENT"}
                """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REPORT_NOT_PROCESSING"));

        assertNoLedger(reportId);
    }

    @Test
    void in_resolveMissingNote_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        long reportId = submitReport(1, "user", REPORTED_USER, null);
        start(admin, reportId).andExpect(status().isOk());

        resolve(admin, reportId, """
                {"outcome":"RESOLVED","violation_type":"HARASSMENT"}
                """)
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

    private ResultActions start(String admin, long reportId) throws Exception {
        return mockMvc.perform(post("/api/admin/reports/" + reportId + "/start")
                .header("Authorization", bearer(admin)));
    }

    private ResultActions resolve(String admin, long reportId, String body) throws Exception {
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

    private void setScore(long userId, int score) {
        jdbcClient.sql("DELETE FROM user_credit_account WHERE user_id = :id")
                .param("id", userId).update();
        jdbcClient.sql("""
                        INSERT INTO user_credit_account (user_id, score, created_at, updated_at)
                        VALUES (:id, :score, :now, :now)
                        """)
                .param("id", userId)
                .param("score", score)
                .param("now", FixedClockTestConfig.NOW.toString())
                .update();
    }

    private void assertScore(long userId, int expected) {
        Integer score = jdbcClient.sql("SELECT score FROM user_credit_account WHERE user_id = :id")
                .param("id", userId).query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(score).isEqualTo(expected);
    }

    private void assertLedger(long reportId, int appliedDelta, int before, int after) {
        var row = jdbcClient.sql("""
                        SELECT reason_code, applied_delta, score_before, score_after, related_type, related_id
                        FROM credit_ledger WHERE idempotency_key = :key
                        """)
                .param("key", "REPORT_VIOLATION:" + reportId)
                .query((rs, rowNum) -> new int[] {rs.getInt("applied_delta"), rs.getInt("score_before"),
                        rs.getInt("score_after")})
                .single();
        org.assertj.core.api.Assertions.assertThat(row)
                .containsExactly(appliedDelta, before, after);
        var meta = jdbcClient.sql("""
                        SELECT reason_code, related_type, related_id
                        FROM credit_ledger WHERE idempotency_key = :key
                        """)
                .param("key", "REPORT_VIOLATION:" + reportId)
                .query((rs, rowNum) -> new String[] {rs.getString("reason_code"),
                        rs.getString("related_type"), rs.getString("related_id")})
                .single();
        org.assertj.core.api.Assertions.assertThat(meta)
                .containsExactly("REPORT_VIOLATION", "REPORT", String.valueOf(reportId));
    }

    private void assertLedgerCount(long reportId, int expected) {
        Integer count = jdbcClient.sql(
                        "SELECT COUNT(*) FROM credit_ledger WHERE idempotency_key = :key")
                .param("key", "REPORT_VIOLATION:" + reportId)
                .query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(count).isEqualTo(expected);
    }

    private void assertNoLedger(long reportId) {
        assertLedgerCount(reportId, 0);
    }

    private void assertReportProcessing(long reportId) {
        String status = jdbcClient.sql("SELECT status FROM reports WHERE id = :id")
                .param("id", reportId).query(String.class).single();
        org.assertj.core.api.Assertions.assertThat(status).isEqualTo("PROCESSING");
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
