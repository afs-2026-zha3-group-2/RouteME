package routeme.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_matchedPair_out_conversationAscending() throws Exception {
        mockMvc.perform(get("/api/trips/4/messages").header("X-User-Id", "1").param("with", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].sender_id").value(3))
                .andExpect(jsonPath("$[3].id").value(4));
    }

    @Test
    void in_pendingApplicant_out_chatNotAllowed() throws Exception {
        mockMvc.perform(get("/api/trips/3/messages").header("X-User-Id", "1").param("with", "2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CHAT_NOT_ALLOWED"));
    }

    @Test
    void in_leftCompanion_out_canStillReadAndSend() throws Exception {
        mockMvc.perform(post("/api/trips/4/leave").header("X-User-Id", "1"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/trips/4/messages").header("X-User-Id", "1").param("with", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4));

        mockMvc.perform(get("/api/trips/4/messages").header("X-User-Id", "3").param("with", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4));

        mockMvc.perform(post("/api/trips/4/messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":3,\"content\":\"退出后还能继续聊。\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("退出后还能继续聊。"));
    }

    @Test
    void in_unrelatedUser_out_chatNotAllowed() throws Exception {
        mockMvc.perform(get("/api/trips/4/messages").header("X-User-Id", "2").param("with", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CHAT_NOT_ALLOWED"));
    }

    @Test
    void in_matchedPair_out_sendAndReadBack() throws Exception {
        mockMvc.perform(post("/api/trips/4/messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":3,\"content\":\" 那周六见。 \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.trip_id").value(4))
                .andExpect(jsonPath("$.sender_id").value(1))
                .andExpect(jsonPath("$.receiver_id").value(3))
                .andExpect(jsonPath("$.content").value("那周六见。"))
                .andExpect(jsonPath("$.sent_at").isNotEmpty());

        mockMvc.perform(get("/api/trips/4/messages").header("X-User-Id", "3").param("with", "1"))
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[4].content").value("那周六见。"));
    }

    @Test
    void in_blankContent_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/trips/4/messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":3,\"content\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_contentOverLimit_out_invalidInput() throws Exception {
        String tooLong = "字".repeat(501);
        mockMvc.perform(post("/api/trips/4/messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":3,\"content\":\"" + tooLong + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_completedTrip_out_chatReadOnly() throws Exception {
        mockMvc.perform(get("/api/trips/1/messages").header("X-User-Id", "1").param("with", "2"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/trips/1/messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":2,\"content\":\"补一条记录\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHAT_READ_ONLY"));
    }

    @Test
    void in_chatPartnersAsApplicant_out_matchedAndHistoryWithOrder() throws Exception {
        mockMvc.perform(get("/api/me/chat-partners").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].trip.id").value(4))
                .andExpect(jsonPath("$[0].other.id").value(3))
                .andExpect(jsonPath("$[0].last_message.id").value(4))
                .andExpect(jsonPath("$[0].message_count").value(4))
                .andExpect(jsonPath("$[1].trip.id").value(2))
                .andExpect(jsonPath("$[1].other.id").value(2))
                .andExpect(jsonPath("$[1].last_message").value(nullValue()))
                .andExpect(jsonPath("$[1].message_count").value(0))
                .andExpect(jsonPath("$[2].trip.id").value(1))
                .andExpect(jsonPath("$[2].other.id").value(2))
                .andExpect(jsonPath("$[2].last_message").value(nullValue()));
    }

    @Test
    void in_chatPartnersAsPublisher_out_pairsWithAcceptedApplicants() throws Exception {
        mockMvc.perform(get("/api/me/chat-partners").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].trip.id").value(4))
                .andExpect(jsonPath("$[0].other.id").value(1))
                .andExpect(jsonPath("$[0].last_message.id").value(4))
                .andExpect(jsonPath("$[1].trip.id").value(6))
                .andExpect(jsonPath("$[1].other.id").value(2))
                .andExpect(jsonPath("$[2].trip.id").value(2))
                .andExpect(jsonPath("$[2].other.id").value(2));
    }

    @Test
    void in_leftCompanion_out_partnerStillListed() throws Exception {
        mockMvc.perform(post("/api/trips/4/leave").header("X-User-Id", "1"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me/chat-partners").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].trip.id").value(4))
                .andExpect(jsonPath("$[0].other.id").value(3));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/trips/4/messages").param("with", "3"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }
}