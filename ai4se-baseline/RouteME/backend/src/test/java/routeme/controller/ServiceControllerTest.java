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

/** User-side customer service entry and message endpoint (Bearer identity). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class ServiceControllerTest {

    private static final String FUTURE = "2027-01-01T00:00:00Z";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_open_out_waitingSessionAndIdempotent() throws Exception {
        String user = register("ServiceUser");

        long first = openSession(user);
        long second = openSession(user);

        org.junit.jupiter.api.Assertions.assertEquals(first, second, "open is idempotent");

        mockMvc.perform(get("/api/service/sessions/current").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(first))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.messages").isArray())
                .andExpect(jsonPath("$.reports").doesNotExist());
    }

    @Test
    void in_currentWithoutSession_out_emptyBody() throws Exception {
        String user = register("NoSessionUser");

        mockMvc.perform(get("/api/service/sessions/current").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }

    @Test
    void in_sendMessage_out_savedAndListed() throws Exception {
        String user = register("ChatUser");
        long sessionId = openSession(user);

        sendMessage(user, sessionId, "I need help")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sender_type").value("USER"))
                .andExpect(jsonPath("$.sender_id").value(userId(user)))
                .andExpect(jsonPath("$.content").value("I need help"));

        mockMvc.perform(get("/api/service/sessions/" + sessionId + "/messages")
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].content").value("I need help"));

        mockMvc.perform(get("/api/service/sessions/current").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message_count").value(1))
                .andExpect(jsonPath("$.messages.length()").value(1));
    }

    @Test
    void in_forgedSenderFields_out_ignored() throws Exception {
        String user = register("ForgedSenderUser");
        long sessionId = openSession(user);

        mockMvc.perform(post("/api/service/sessions/" + sessionId + "/messages")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"forged","senderRole":"STAFF","sender_type":"STAFF","sender_id":9999}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sender_type").value("USER"))
                .andExpect(jsonPath("$.sender_id").value(userId(user)));
    }

    @Test
    void in_blankOrOversizedMessage_out_invalidInput() throws Exception {
        String user = register("BadMessageUser");
        long sessionId = openSession(user);

        sendMessage(user, sessionId, "   ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        sendMessage(user, sessionId, "x".repeat(501))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_otherUsersSession_out_notFound() throws Exception {
        String owner = register("OwnerUser");
        String stranger = register("StrangerUser");
        long sessionId = openSession(owner);

        mockMvc.perform(get("/api/service/sessions/" + sessionId + "/messages")
                        .header("Authorization", bearer(stranger)))
                .andExpect(status().isNotFound());

        sendMessage(stranger, sessionId, "hijack")
                .andExpect(status().isNotFound());
    }

    @Test
    void in_closedSession_out_sessionClosed() throws Exception {
        String user = register("ClosedSessionUser");
        String admin = login("admin", "admin12345");
        long sessionId = openSession(user);
        join(admin, sessionId);
        close(user, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closed_at").value(FixedClockTestConfig.NOW.toString()));

        sendMessage(user, sessionId, "still there?")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_CLOSED"));

        mockMvc.perform(get("/api/service/sessions/" + sessionId + "/messages")
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk());
    }

    @Test
    void in_waitingClose_out_closed() throws Exception {
        String user = register("CloseWaitingUser");
        long sessionId = openSession(user);

        close(user, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.closed_at").value(FixedClockTestConfig.NOW.toString()));

        long reopened = openSession(user);
        org.junit.jupiter.api.Assertions.assertNotEquals(
                sessionId, reopened, "closing a waiting session frees a new one");
    }

    @Test
    void in_resolvedClose_out_keepsResolvedAudit() throws Exception {
        String user = register("CloseResolvedUser");
        String admin = login("admin", "admin12345");
        long sessionId = openSession(user);
        join(admin, sessionId);
        resolve(admin, sessionId);

        close(user, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.resolved_at").value(FixedClockTestConfig.NOW.toString()))
                .andExpect(jsonPath("$.closed_at").value(FixedClockTestConfig.NOW.toString()));
    }

    @Test
    void in_otherUsersClose_out_notFound() throws Exception {
        String owner = register("CloseOwner");
        String stranger = register("CloseStranger");
        long sessionId = openSession(owner);

        close(stranger, sessionId).andExpect(status().isNotFound());

        mockMvc.perform(get("/api/service/sessions/current")
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAITING"));
    }

    @Test
    void in_closeTwice_out_sessionClosed() throws Exception {
        String user = register("CloseTwiceUser");
        long sessionId = openSession(user);
        close(user, sessionId).andExpect(status().isOk());

        close(user, sessionId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SESSION_CLOSED"));
    }

    @Test
    void in_resolvedMessage_out_backToHandling() throws Exception {
        String user = register("ResolvedChatUser");
        String admin = login("admin", "admin12345");
        long sessionId = openSession(user);
        join(admin, sessionId);
        resolve(admin, sessionId);

        mockMvc.perform(get("/api/service/sessions/current")
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolved_at").value(FixedClockTestConfig.NOW.toString()));

        sendMessage(user, sessionId, "not solved yet").andExpect(status().isCreated());

        mockMvc.perform(get("/api/service/sessions/current")
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HANDLING"))
                .andExpect(jsonPath("$.resolved_at").doesNotExist());
    }

    @Test
    void in_resolvedOpen_out_returnsExisting() throws Exception {
        String user = register("ResolvedOpenUser");
        String admin = login("admin", "admin12345");
        long sessionId = openSession(user);
        join(admin, sessionId);
        resolve(admin, sessionId);

        long reopened = openSession(user);
        org.junit.jupiter.api.Assertions.assertEquals(
                sessionId, reopened, "RESOLVED still blocks a second open session");
    }

    @Test
    void in_missingBearer_out_sessionInvalid() throws Exception {
        mockMvc.perform(post("/api/service/sessions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));

        mockMvc.perform(get("/api/service/sessions/current"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));

        mockMvc.perform(post("/api/service/sessions/1/close"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void in_suspendedUser_out_canStillOpenSessionAndReply() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("SuspendedServiceUser");
        changeStatus(admin, userId(user), """
                {"action":"SUSPEND","reason":"temporary"}
                """).andExpect(status().isOk());

        long sessionId = openSession(user);

        sendMessage(user, sessionId, "suspended but supported")
                .andExpect(status().isCreated());
    }

    @Test
    void in_bannedUser_out_accountBanned() throws Exception {
        String admin = login("admin", "admin12345");
        String user = register("BannedServiceUser");
        long sessionId = openSession(user);
        changeStatus(admin, userId(user), """
                {"action":"BAN","reason":"severe","ban_reason_code":"HARASSMENT",
                 "ban_expires_at":"%s"}
                """.formatted(FUTURE)).andExpect(status().isOk());

        mockMvc.perform(post("/api/service/sessions").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_BANNED"));

        sendMessage(user, sessionId, "let me in")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_BANNED"));
    }

    private long openSession(String session) throws Exception {
        String body = mockMvc.perform(post("/api/service/sessions").header("Authorization", bearer(session)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(body, "$.id");
        return id.longValue();
    }

    private org.springframework.test.web.servlet.ResultActions sendMessage(
            String session, long sessionId, String content) throws Exception {
        return mockMvc.perform(post("/api/service/sessions/" + sessionId + "/messages")
                .header("Authorization", bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"" + content + "\"}"));
    }

    private void join(String admin, long sessionId) throws Exception {
        mockMvc.perform(post("/api/admin/service/sessions/" + sessionId + "/join")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
    }

    private void resolve(String admin, long sessionId) throws Exception {
        mockMvc.perform(post("/api/admin/service/sessions/" + sessionId + "/resolve")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions close(String user, long sessionId)
            throws Exception {
        return mockMvc.perform(post("/api/service/sessions/" + sessionId + "/close")
                .header("Authorization", bearer(user)));
    }

    private org.springframework.test.web.servlet.ResultActions changeStatus(
            String admin, long userId, String body) throws Exception {
        return mockMvc.perform(post("/api/admin/users/" + userId + "/status")
                .header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String register(String nickname) throws Exception {
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"}
                """.formatted("s" + UUID.randomUUID().toString().replace("-", "").substring(0, 12), nickname);
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