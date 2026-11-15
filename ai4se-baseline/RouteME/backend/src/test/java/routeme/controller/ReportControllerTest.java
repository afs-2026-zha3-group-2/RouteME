package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_tripReport_out_recorded() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"target_type":"trip","target_id":3,"reason":"safety","note":" 集合地点与描述不符。 "}
                                 """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.received").value(true));

        Integer count = jdbcClient.sql("SELECT COUNT(*) FROM reports WHERE target_type = 'trip' AND target_id = 3")
                .query(Integer.class)
                .single();
        assertEquals(1, count, "report persisted");
    }

    @Test
    void in_userReportWithoutNote_out_recordedWithNullNote() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target_type\":\"user\",\"target_id\":3,\"reason\":\"harassment\"}"))
                .andExpect(status().isCreated());

        Integer nullNotes = jdbcClient.sql(
                                "SELECT COUNT(*) FROM reports WHERE target_type = 'user' AND target_id = 3 AND note IS NULL")
                        .query(Integer.class)
                        .single();
                assertEquals(1, nullNotes, "note stays null");
    }

    @Test
    void in_invalidTargetType_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target_type\":\"planet\",\"target_id\":3,\"reason\":\"safety\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_invalidReason_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target_type\":\"trip\",\"target_id\":3,\"reason\":\"boring\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_noteOverLimit_out_invalidInput() throws Exception {
        String tooLong = "说".repeat(201);
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target_type\":\"trip\",\"target_id\":3,\"reason\":\"other\",\"note\":\""
                                + tooLong + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target_type\":\"trip\",\"target_id\":3,\"reason\":\"other\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }
}