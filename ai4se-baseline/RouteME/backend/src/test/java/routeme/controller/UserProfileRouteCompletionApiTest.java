package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
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

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import routeme.config.FixedClockTestConfig;

/**
 * 路线完成度的只读契约：有声明按声明聚合；无声明时按历史已结束行程数兜底
 * （1 条 → 75 neutral，2 条 → 80 good）；两者皆无恒为 {@code insufficient} 且省略数值。
 * 与信用分、资料统计完全独立；唯一写入入口是结束行程（见 TripRouteCompletionApiTest），
 * 资料保存不得伪造完成度。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class UserProfileRouteCompletionApiTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String COMPLETE_BODY = """
            {"nickname":"小夏","birthday":"2003-05-18","gender":"女","city":"珠海",
             "school":"中山大学","major":"地理科学","interests":["摄影","美食","徒步"],
             "travel_style":"休闲游","route_completion_state":"good","route_completion_rate":100}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_selfProfile_out_legacyFallbackRate() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("neutral"))
                .andExpect(jsonPath("$.route_completion_rate").value(75));
    }

    /**
     * 无声明的种子用户：按历史已结束行程数兜底。固定时钟 2026-11-16 下只有行程 1（用户 1）
     * 与行程 2（用户 2）已结束，各 1 条 → 75 neutral；用户 3、4 没有已结束行程，仍是数据不足。
     */
    @Test
    void in_seededUsersWithoutDeclarations_out_fallbackByCompletedTripCount() throws Exception {
        for (long userId : new long[] {1L, 2L}) {
            mockMvc.perform(get("/api/users/{userId}/profile", userId).header("X-User-Id", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.route_completion_state").value("neutral"))
                    .andExpect(jsonPath("$.route_completion_rate").value(75));
        }
        for (long userId : new long[] {3L, 4L}) {
            mockMvc.perform(get("/api/users/{userId}/profile", userId).header("X-User-Id", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.route_completion_state").value("insufficient"))
                    .andExpect(jsonPath("$.route_completion_rate").doesNotExist());
        }
    }

    @Test
    void in_selfAndOtherViews_out_identicalCompletionFields() throws Exception {
        Map<String, JsonNode> self = completionFields("1", 1L);
        Map<String, JsonNode> other = completionFields("2", 1L);

        assertAll(
                () -> assertEquals(self, other, "self and other views agree on completion fields"),
                () -> assertEquals("neutral", self.get("route_completion_state").asText()),
                () -> assertEquals(75, self.get("route_completion_rate").asInt(), "legacy fallback rate"));
    }

    @Test
    void in_profileRead_out_creditFieldsAndLedgerUnchanged() throws Exception {
        int ledgerBefore = ledgerRows();

        mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.credit_level").value("good"))
                .andExpect(jsonPath("$.credit_restricted").value(false))
                .andExpect(jsonPath("$.route_completion_state").value("neutral"));

        assertEquals(ledgerBefore, ledgerRows(), "profile read must not write credit_ledger");
    }

    @Test
    void in_seededProfile_out_statsUnchangedWithoutGrowthFields() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 2L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.published").value(3))
                .andExpect(jsonPath("$.stats.completed").value(1))
                .andExpect(jsonPath("$.stats.joined").value(2))
                .andExpect(jsonPath("$.stats.shared").value(1))
                .andExpect(jsonPath("$.growth_level").doesNotExist())
                .andExpect(jsonPath("$.lv").doesNotExist())
                .andExpect(jsonPath("$.route_completion_state").value("neutral"));
    }

    @Test
    void in_saveWithCompletionFields_out_ignored() throws Exception {
        String session = register("完成度只读");
        long userId = userId(session);

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPLETE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("insufficient"))
                .andExpect(jsonPath("$.route_completion_rate").doesNotExist());

        mockMvc.perform(get("/api/users/{userId}/profile", userId).header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route_completion_state").value("insufficient"))
                .andExpect(jsonPath("$.route_completion_rate").doesNotExist());
    }

    @Test
    void in_missingCaller_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 1L))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_unknownTarget_out_userNotFound() throws Exception {
        mockMvc.perform(get("/api/users/9999/profile").header("X-User-Id", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    /** 只有资料端点下发两字段；不存在单独的完成度写入 / 聚合端点。 */
    @Test
    void in_completionEndpoint_out_notFound() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/route-completion", 1L).header("X-User-Id", 1L))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/users/{userId}/route-completion", 1L).header("X-User-Id", 1L))
                .andExpect(status().isNotFound());
    }

    private Map<String, JsonNode> completionFields(String callerId, long userId) throws Exception {
        String body = mockMvc.perform(get("/api/users/{userId}/profile", userId).header("X-User-Id", callerId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode profile = MAPPER.readTree(body);
        Map<String, JsonNode> fields = new LinkedHashMap<>();
        fields.put("route_completion_state", profile.path("route_completion_state"));
        if (profile.has("route_completion_rate")) {
            fields.put("route_completion_rate", profile.get("route_completion_rate"));
        }
        return fields;
    }

    private int ledgerRows() {
        return jdbcClient.sql("SELECT COUNT(*) FROM credit_ledger").query(Integer.class).single();
    }

    private String register(String nickname) throws Exception {
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"}
                """.formatted(uniqueUsername(), nickname);
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    private static String uniqueUsername() {
        return "p" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String bearer(String session) {
        return "Bearer " + JsonPath.read(session, "$.token");
    }

    private static long userId(String session) {
        Number id = JsonPath.read(session, "$.user.id");
        return id.longValue();
    }
}
