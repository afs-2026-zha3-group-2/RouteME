package routeme.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;
import routeme.service.AccountStatusService;

/** Admin user management: list, search, detail, status transitions and access control. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class AdminUserControllerTest {

    private static final String FUTURE = "2027-01-01T00:00:00Z";
    private static final String PAST = "2026-01-01T00:00:00Z";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AccountStatusService accountStatusService;

    @Test
    void in_adminBearer_out_userListPaged() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.total").value(greaterThanOrEqualTo(5)))
                .andExpect(jsonPath("$.items[0].role").exists())
                .andExpect(jsonPath("$.items[0].status").exists())
                .andExpect(jsonPath("$.items[0].created_at").exists());
    }

    @Test
    void in_missingBearer_out_sessionInvalid() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void in_normalUser_out_adminRequired() throws Exception {
        String user = register("NormalUser");

        mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_REQUIRED"));
    }

    @Test
    void in_searchByEmail_out_caseInsensitiveMatch() throws Exception {
        String admin = login("admin", "admin12345");
        String user = registerWithEmail("SearchUser", "Search.Me@Example.com");

        mockMvc.perform(get("/api/admin/users")
                        .param("q", "SEARCH.ME")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(userId(user)))
                .andExpect(jsonPath("$.items[0].email").value("search.me@example.com"));
    }

    @Test
    void in_searchById_out_exactMatch() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(get("/api/admin/users")
                        .param("q", String.valueOf(userId(admin)))
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(userId(admin)));
    }

    @Test
    void in_searchByNickname_out_partialMatch() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("NicknameTarget");

        mockMvc.perform(get("/api/admin/users")
                        .param("q", "cknameTarg")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(userId(user)))
                .andExpect(jsonPath("$.items[0].nickname").value("NicknameTarget"));
    }

    @Test
    void in_statusFilter_out_onlyMatchingRows() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("FilteredUser");
        changeStatus(admin, userId(user), """
                {"action":"SUSPEND","reason":"spam"}
                """);

        mockMvc.perform(get("/api/admin/users")
                        .param("status", "SUSPENDED")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(userId(user)))
                .andExpect(jsonPath("$.items[0].status").value("SUSPENDED"));
    }

    @Test
    void in_detail_out_relationsAndTotals() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(get("/api/admin/users/2").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.trips.length()").value(3))
                .andExpect(jsonPath("$.trip_total").value(3))
                .andExpect(jsonPath("$.experiences.length()").value(1))
                .andExpect(jsonPath("$.experience_total").value(1))
                .andExpect(jsonPath("$.reports.length()").value(0))
                .andExpect(jsonPath("$.report_total").value(0))
                .andExpect(jsonPath("$.interests").isArray())
                .andExpect(jsonPath("$.status_reason").doesNotExist());
    }

    @Test
    void in_detail_out_includesRelatedReports() throws Exception {
        String admin = login("admin", "admin12345");
        submitReport(1, "user", 2);

        mockMvc.perform(get("/api/admin/users/2").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.report_total").value(1))
                .andExpect(jsonPath("$.reports.length()").value(1))
                .andExpect(jsonPath("$.reports[0].direction").value("REPORTED"))
                .andExpect(jsonPath("$.reports[0].status").value("PENDING"))
                .andExpect(jsonPath("$.reports[0].code").value("R-1"));
    }

    @Test
    void in_unknownUser_out_userNotFound() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(get("/api/admin/users/999999").header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void in_suspend_out_recordsPenalty() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("SuspendMe");

        changeStatus(admin, userId(user), """
                {"action":"SUSPEND","reason":"harassment"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"))
                .andExpect(jsonPath("$.status_reason").value("harassment"))
                .andExpect(jsonPath("$.status_updated_at").value(FixedClockTestConfig.NOW.toString()))
                .andExpect(jsonPath("$.status_updated_by.id").value(userId(admin)))
                .andExpect(jsonPath("$.ban_expires_at").doesNotExist())
                .andExpect(jsonPath("$.ban_reason_code").doesNotExist());
    }

    @Test
    void in_suspendWithoutReason_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("NoReason");

        changeStatus(admin, userId(user), """
                {"action":"SUSPEND"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_ban_out_storesReasonAndExpiry() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("BanMe");

        changeStatus(admin, userId(user), """
                {"action":"BAN","reason":"fake trip","ban_reason_code":"FAKE_TRIP",
                 "ban_reason_note":"repeated","ban_expires_at":"%s"}
                """.formatted(FUTURE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BANNED"))
                .andExpect(jsonPath("$.ban_reason_code").value("FAKE_TRIP"))
                .andExpect(jsonPath("$.ban_reason_note").value("repeated"))
                .andExpect(jsonPath("$.ban_expires_at").value(FUTURE));
    }

    @Test
    void in_banOtherWithoutNote_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("OtherBan");

        changeStatus(admin, userId(user), """
                {"action":"BAN","reason":"other","ban_reason_code":"OTHER","ban_expires_at":"%s"}
                """.formatted(FUTURE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_banExpiryNotInFuture_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("PastBan");

        changeStatus(admin, userId(user), """
                {"action":"BAN","reason":"past","ban_reason_code":"HARASSMENT","ban_expires_at":"%s"}
                """.formatted(PAST))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_restore_out_activeAndHidesBanFields() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("RestoreMe");
        changeStatus(admin, userId(user), """
                {"action":"SUSPEND","reason":"temporary"}
                """).andExpect(status().isOk());

        changeStatus(admin, userId(user), """
                {"action":"RESTORE"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.status_reason").value("管理员恢复账号"))
                .andExpect(jsonPath("$.ban_expires_at").doesNotExist())
                .andExpect(jsonPath("$.ban_reason_code").doesNotExist());
    }

    @Test
    void in_suspendTwice_out_invalidTransition() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("TwiceSuspend");
        changeStatus(admin, userId(user), """
                {"action":"SUSPEND","reason":"first"}
                """).andExpect(status().isOk());

        changeStatus(admin, userId(user), """
                {"action":"SUSPEND","reason":"second"}
                """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));
    }

    @Test
    void in_selfSuspend_out_cannotTargetSelf() throws Exception {
        String admin = login("admin", "admin12345");

        changeStatus(admin, userId(admin), """
                {"action":"SUSPEND","reason":"self"}
                """)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CANNOT_TARGET_SELF"));
    }

    @Test
    void in_unknownAction_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("UnknownAction");

        changeStatus(admin, userId(user), """
                {"action":"DELETE","reason":"nope"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_unknownStatusFilter_out_invalidInput() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(get("/api/admin/users")
                        .param("status", "DELETED")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_suspendedAdmin_out_accountSuspended() throws Exception {
        String admin = login("admin", "admin12345");
        accountStatusService.suspend(userId(admin), userId(admin), "temporary", false);

        mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(admin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));
    }

    private org.springframework.test.web.servlet.ResultActions changeStatus(
            String admin, long userId, String body) throws Exception {
        return mockMvc.perform(post("/api/admin/users/" + userId + "/status")
                .header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private void submitReport(long reporterId, String targetType, long targetId) throws Exception {
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", String.valueOf(reporterId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"target_type":"%s","target_id":%d,"reason":"safety"}
                                """.formatted(targetType, targetId)))
                .andExpect(status().isCreated());
    }

    private String register(String nickname) throws Exception {
        return registerWithEmail(nickname, null);
    }

    private String registerWithEmail(String nickname, String email) throws Exception {
        String emailField = email == null ? "" : ",\"email\":\"" + email + "\"";
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"%s}
                """.formatted(uniqueUsername(), nickname, emailField);
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

    private static String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}