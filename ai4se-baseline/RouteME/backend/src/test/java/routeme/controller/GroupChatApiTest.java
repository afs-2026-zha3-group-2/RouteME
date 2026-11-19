package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

/**
 * 满员自动建群与群消息读写。种子行程 6 满员（发布者 3、同行者 2），
 * V39 已回填欢迎消息；行程 5 招募中（发布者 2、待处理申请 6 来自用户 3）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class GroupChatApiTest {

    private static final String WELCOME = "人齐了，群聊已开通，路线和集合细节在这里商量。";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_backfilledFullTrip_out_membersReadWelcomeMessage() throws Exception {
        mockMvc.perform(get("/api/trips/6/group-messages").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].trip_id").value(6))
                .andExpect(jsonPath("$[0].sender.id").value(3))
                .andExpect(jsonPath("$[0].sender.nickname").isNotEmpty())
                .andExpect(jsonPath("$[0].content").value(WELCOME))
                .andExpect(jsonPath("$[0].sent_at").value("2026-11-12T09:00:00Z"));

        mockMvc.perform(get("/api/trips/6/group-messages").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(get("/api/trips/6").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.group_open").value(true));
    }

    @Test
    void in_nonMember_out_chatNotAllowed() throws Exception {
        mockMvc.perform(get("/api/trips/6/group-messages").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CHAT_NOT_ALLOWED"));

        mockMvc.perform(post("/api/trips/6/group-messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"路过看看\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CHAT_NOT_ALLOWED"));
    }

    @Test
    void in_recruitingTrip_out_groupNotFound() throws Exception {
        mockMvc.perform(get("/api/trips/5/group-messages").header("X-User-Id", "2"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));

        mockMvc.perform(get("/api/trips/5").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.group_open").value(false));

        mockMvc.perform(get("/api/trips/999/group-messages").header("X-User-Id", "1"))
                .andExpect(status().isNotFound());
    }

    @Test
    void in_acceptToFull_out_groupOpenedOnceAndSurvivesLeaveAndRefill() throws Exception {
        // 把行程 5 收窄到 2 人，接受申请 6 即满员建群。
        jdbcClient.sql("UPDATE trip_plans SET capacity = 2 WHERE id = 5").update();
        mockMvc.perform(post("/api/applications/6/accept").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"));

        mockMvc.perform(get("/api/trips/5/group-messages").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].sender.id").value(2))
                .andExpect(jsonPath("$[0].content").value(WELCOME));

        Integer opened = jdbcClient.sql("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = 3 AND event = 'trip_group_opened' AND trip_id = 5
                """).query(Integer.class).single();
        assertEquals(1, opened, "companion is notified when the group opens");

        // 退出后自动退群：历史消息仍可回看，但发送被拒（CHAT_LEFT）；群因已有消息保留。
        mockMvc.perform(post("/api/trips/5/leave")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/trips/5/group-messages").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].content").value(WELCOME));
        mockMvc.perform(post("/api/trips/5/group-messages")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"退出后还能发吗\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CHAT_LEFT"));
        // 我的群聊保留已退出的群，并用 left 标记只读；仍作为发布者的行程 6 不在左侧标记。
        mockMvc.perform(get("/api/me/group-chats").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].trip.id").value(5))
                .andExpect(jsonPath("$[0].left").value(true))
                .andExpect(jsonPath("$[1].trip.id").value(6))
                .andExpect(jsonPath("$[1].left").value(false));
        mockMvc.perform(get("/api/trips/5/group-messages").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // 重新申请并再次满员：欢迎消息幂等，不重复落库。
        String created = mockMvc.perform(post("/api/trips/5/applications")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int applicationId = JsonPath.read(created, "$.id");
        mockMvc.perform(post("/api/applications/" + applicationId + "/accept").header("X-User-Id", "2"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/trips/5/group-messages").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // 我的群聊：行程 5 的欢迎消息晚于行程 6 的回填，排在前面。
        mockMvc.perform(get("/api/me/group-chats").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].trip.id").value(5))
                .andExpect(jsonPath("$[0].member_count").value(2))
                .andExpect(jsonPath("$[0].message_count").value(1))
                .andExpect(jsonPath("$[0].last_message.content").value(WELCOME))
                .andExpect(jsonPath("$[1].trip.id").value(6));
    }

    @Test
    void in_memberSend_out_readBackAndNotifyOthersOnly() throws Exception {
        mockMvc.perform(post("/api/trips/6/group-messages")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\" 集合点改到祖庙地铁站 A 口 \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trip_id").value(6))
                .andExpect(jsonPath("$.sender.id").value(2))
                .andExpect(jsonPath("$.content").value("集合点改到祖庙地铁站 A 口"))
                .andExpect(jsonPath("$.sent_at").isNotEmpty());

        mockMvc.perform(get("/api/trips/6/group-messages").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].content").value("集合点改到祖庙地铁站 A 口"));

        Integer toPublisher = jdbcClient.sql("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = 3 AND event = 'group_message' AND trip_id = 6
                """).query(Integer.class).single();
        Integer toSelf = jdbcClient.sql("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = 2 AND event = 'group_message' AND trip_id = 6
                """).query(Integer.class).single();
        assertEquals(1, toPublisher, "other members get the group message notification");
        assertEquals(0, toSelf, "sender does not notify themselves");
    }

    @Test
    void in_blankOrOverLimitContent_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/trips/6/group-messages")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        mockMvc.perform(post("/api/trips/6/group-messages")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + "字".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_completedTrip_out_readOnlyReplay() throws Exception {
        jdbcClient.sql("UPDATE trip_plans SET completed_at = '2026-11-16T08:00:00Z' WHERE id = 6")
                .update();
        mockMvc.perform(get("/api/trips/6/group-messages").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(post("/api/trips/6/group-messages")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"结束后还能发吗\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHAT_READ_ONLY"));
    }

    @Test
    void in_cancelledTrip_out_readOnlyReplay() throws Exception {
        jdbcClient.sql("UPDATE trip_plans SET cancelled_at = '2026-11-15T09:00:00Z' WHERE id = 6")
                .update();
        mockMvc.perform(get("/api/trips/6/group-messages").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(post("/api/trips/6/group-messages")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"取消后还能发吗\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHAT_READ_ONLY"));
    }

    @Test
    void in_myGroupsAsOutsider_out_emptyList() throws Exception {
        mockMvc.perform(get("/api/me/group-chats").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/me/group-chats").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].trip.id").value(6))
                .andExpect(jsonPath("$[0].member_count").value(2))
                .andExpect(jsonPath("$[0].last_message.sender.id").value(3));
    }

    @Test
    void in_suspendedSender_out_accountSuspendedAndNoNewMessage() throws Exception {
        jdbcClient.sql("UPDATE app_users SET status = 'SUSPENDED' WHERE id = 2").update();
        Integer before = jdbcClient.sql("SELECT COUNT(*) FROM trip_group_messages")
                .query(Integer.class).single();

        mockMvc.perform(post("/api/trips/6/group-messages")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"暂停后还能发吗\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        Integer after = jdbcClient.sql("SELECT COUNT(*) FROM trip_group_messages")
                .query(Integer.class).single();
        assertEquals(before, after, "suspended sender writes no group row");
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/trips/6/group-messages"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));

        mockMvc.perform(get("/api/me/group-chats"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }
}