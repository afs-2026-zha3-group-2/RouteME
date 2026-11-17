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

/** User-side "my reports" list behind Bearer identity (design D17). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class HelpControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_noReports_out_emptyList() throws Exception {
        String user = register("EmptyHelpUser");

        mockMvc.perform(get("/api/help/reports").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void in_ownReports_out_listedNewestFirst() throws Exception {
        String user = register("HelpUser");
        long first = submitReport(userId(user), "trip", 1);
        long second = submitReport(userId(user), "user", 3);

        mockMvc.perform(get("/api/help/reports").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value(second))
                .andExpect(jsonPath("$.items[0].code").value("R-" + second))
                .andExpect(jsonPath("$.items[0].target_type").value("user"))
                .andExpect(jsonPath("$.items[1].id").value(first))
                .andExpect(jsonPath("$.items[1].code").value("R-" + first))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[0].reason").value("safety"))
                .andExpect(jsonPath("$.items[0].created_at").value(FixedClockTestConfig.NOW.toString()))
                .andExpect(jsonPath("$.items[0].note").doesNotExist())
                .andExpect(jsonPath("$.items[0].resolution_note").doesNotExist())
                .andExpect(jsonPath("$.items[0].resolution_action").doesNotExist())
                .andExpect(jsonPath("$.items[0].target_label").exists());
    }

    @Test
    void in_otherUserReports_out_notIncluded() throws Exception {
        String user = register("HelpOwner");
        String stranger = register("HelpStranger");
        submitReport(userId(user), "trip", 1);

        mockMvc.perform(get("/api/help/reports").header("Authorization", bearer(stranger)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void in_missingBearer_out_sessionInvalid() throws Exception {
        mockMvc.perform(get("/api/help/reports"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    private long submitReport(long reporterId, String targetType, long targetId) throws Exception {
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", String.valueOf(reporterId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"target_type":"%s","target_id":%d,"reason":"safety"}
                                """.formatted(targetType, targetId)))
                .andExpect(status().isCreated());
        return jdbcClient.sql("SELECT MAX(id) FROM reports").query(Long.class).single();
    }

    private String register(String nickname) throws Exception {
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"}
                """.formatted("h" + UUID.randomUUID().toString().replace("-", "").substring(0, 12), nickname);
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
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