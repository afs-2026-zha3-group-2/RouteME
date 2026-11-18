package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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

/** Admin customer-service workstation: queue, detail, join, close and replies. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class AdminServiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_queue_out_waitingSession() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsQueueUser");
        long sessionId = openSession(user);

        mockMvc.perform(get("/api/admin/service/sessions").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(sessionId))
                .andExpect(jsonPath("$.items[0].status").value("WAITING"))
                .andExpect(jsonPath("$.items[0].user.id").value(userId(user)))
                .andExpect(jsonPath("$.items[0].user.nickname").value("CsQueueUser"))
                .andExpect(jsonPath("$.items[0].message_count").value(0))
                .andExpect(jsonPath("$.items[0].last_message_at").doesNotExist());
    }

    @Test
    void in_join_out_handling() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsJoinUser");
        long sessionId = openSession(user);

        join(admin, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HANDLING"))
                .andExpect(jsonPath("$.joined_at").value(FixedClockTestConfig.NOW.toString()));

        mockMvc.perform(get("/api/admin/service/sessions")
                        .param("status", "HANDLING")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(sessionId));
    }

    @Test
    void in_joinTwice_out_sessionAlreadyHandling() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsJoinTwice");
        long sessionId = openSession(user);
        join(admin, sessionId).andExpect(status().isOk());

        join(admin, sessionId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_ALREADY_HANDLING"));
    }

    @Test
    void in_resolve_out_resolved() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsResolveUser");
        long sessionId = openSession(user);
        join(admin, sessionId).andExpect(status().isOk());

        resolve(admin, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolved_at").value(FixedClockTestConfig.NOW.toString()));

        mockMvc.perform(get("/api/admin/service/sessions/" + sessionId)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }

    @Test
    void in_resolveWaiting_out_sessionNotHandling() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsResolveWaiting");
        long sessionId = openSession(user);

        resolve(admin, sessionId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_NOT_HANDLING"));
    }

    @Test
    void in_resolveTwice_out_sessionNotHandling() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsResolveTwice");
        long sessionId = openSession(user);
        join(admin, sessionId).andExpect(status().isOk());
        resolve(admin, sessionId).andExpect(status().isOk());

        resolve(admin, sessionId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_NOT_HANDLING"));
    }

    @Test
    void in_adminCloseWaiting_out_closed() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsAdminCloseWait");
        long sessionId = openSession(user);

        close(admin, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closed_at").value(FixedClockTestConfig.NOW.toString()));

        mockMvc.perform(get("/api/service/sessions/current").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }

    @Test
    void in_adminCloseHandling_out_closed() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsAdminCloseHandling");
        long sessionId = openSession(user);
        join(admin, sessionId).andExpect(status().isOk());
        sendMessage(user, sessionId, "still there?").andExpect(status().isCreated());

        close(admin, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.message_count").value(1));

        sendMessage(user, sessionId, "hello again")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_CLOSED"));
    }

    @Test
    void in_adminCloseResolved_out_closedAndKeepsResolved() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsAdminCloseResolved");
        long sessionId = openSession(user);
        join(admin, sessionId).andExpect(status().isOk());
        resolve(admin, sessionId).andExpect(status().isOk());

        close(admin, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.resolved_at").value(FixedClockTestConfig.NOW.toString()))
                .andExpect(jsonPath("$.closed_at").value(FixedClockTestConfig.NOW.toString()));
    }

    @Test
    void in_adminCloseTwice_out_sessionClosed() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsAdminCloseTwice");
        long sessionId = openSession(user);
        close(admin, sessionId).andExpect(status().isOk());

        close(admin, sessionId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_CLOSED"));
    }

    @Test
    void in_adminCloseUnknown_out_notFound() throws Exception {
        String admin = login("admin", "admin12345");

        close(admin, 999999).andExpect(status().isNotFound());
    }

    @Test
    void in_resolvedMessage_out_backToHandling() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsResolvedReply");
        long sessionId = openSession(user);
        join(admin, sessionId).andExpect(status().isOk());
        resolve(admin, sessionId).andExpect(status().isOk());

        mockMvc.perform(post("/api/service/sessions/" + sessionId + "/messages")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"anything else?"}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/admin/service/sessions/" + sessionId)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HANDLING"))
                .andExpect(jsonPath("$.resolved_at").doesNotExist());
    }

    @Test
    void in_adminReply_out_senderTypeAdmin() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsChatUser");
        long sessionId = openSession(user);
        sendMessage(user, sessionId, "hello support").andExpect(status().isCreated());

        mockMvc.perform(post("/api/service/sessions/" + sessionId + "/messages")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"how can I help?"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sender_type").value("ADMIN"))
                .andExpect(jsonPath("$.sender_id").value(userId(admin)))
                .andExpect(jsonPath("$.sender_nickname").value("平台管理员"));

        mockMvc.perform(get("/api/admin/service/sessions/" + sessionId)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message_count").value(2))
                .andExpect(jsonPath("$.messages.length()").value(2))
                .andExpect(jsonPath("$.messages[0].sender_type").value("USER"))
                .andExpect(jsonPath("$.messages[1].sender_type").value("ADMIN"))
                .andExpect(jsonPath("$.last_message_at").value(FixedClockTestConfig.NOW.toString()));
    }

    @Test
    void in_detail_out_includesUserAndReports() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("CsReportUser");
        long sessionId = openSession(user);
        submitReport(userId(user), "trip", 1);

        mockMvc.perform(get("/api/admin/service/sessions/" + sessionId)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(userId(user)))
                .andExpect(jsonPath("$.user.status").value("ACTIVE"))
                .andExpect(jsonPath("$.reports.length()").value(1))
                .andExpect(jsonPath("$.reports[0].direction").value("REPORTER"))
                .andExpect(jsonPath("$.reports[0].status").value("PENDING"));
    }

    @Test
    void in_unknownSession_out_notFound() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(get("/api/admin/service/sessions/999999").header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/admin/service/sessions/999999/join")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void in_normalUser_out_adminRequired() throws Exception {
        String user = register("CsForbidden");

        mockMvc.perform(get("/api/admin/service/sessions").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_REQUIRED"));
    }

    @Test
    void in_missingBearer_out_sessionInvalid() throws Exception {
        mockMvc.perform(get("/api/admin/service/sessions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    private long openSession(String session) throws Exception {
        String body = mockMvc.perform(post("/api/service/sessions").header("Authorization", bearer(session)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(body, "$.id");
        return id.longValue();
    }

    private org.springframework.test.web.servlet.ResultActions join(String admin, long sessionId)
            throws Exception {
        return mockMvc.perform(post("/api/admin/service/sessions/" + sessionId + "/join")
                .header("Authorization", bearer(admin)));
    }

    private org.springframework.test.web.servlet.ResultActions resolve(String admin, long sessionId)
            throws Exception {
        return mockMvc.perform(post("/api/admin/service/sessions/" + sessionId + "/resolve")
                .header("Authorization", bearer(admin)));
    }

    private org.springframework.test.web.servlet.ResultActions close(String admin, long sessionId)
            throws Exception {
        return mockMvc.perform(post("/api/admin/service/sessions/" + sessionId + "/close")
                .header("Authorization", bearer(admin)));
    }

    private org.springframework.test.web.servlet.ResultActions sendMessage(
            String session, long sessionId, String content) throws Exception {
        return mockMvc.perform(post("/api/service/sessions/" + sessionId + "/messages")
                .header("Authorization", bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"" + content + "\"}"));
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
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"}
                """.formatted("c" + UUID.randomUUID().toString().replace("-", "").substring(0, 12), nickname);
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