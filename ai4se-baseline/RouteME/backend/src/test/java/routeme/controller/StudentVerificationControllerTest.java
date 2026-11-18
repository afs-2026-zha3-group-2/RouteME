package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

/**
 * 学信网认证端点与核心动作门槛（演示核验）：
 * 新注册账号未认证时发布返回 403 {@code STUDENT_VERIFICATION_REQUIRED}，
 * 提交合法认证信息后立即放行；字段校验失败返回 400 与原因码，且不写库。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class StudentVerificationControllerTest {

    private static final String VERIFICATION = "/api/users/me/student-verification";

    private static final String TRIP_BODY = """
            {
              "title": "认证后发布的老城散步",
              "destination_code": "440100",
              "start_date": "2026-11-20",
              "end_date": "2026-11-20",
              "stops": ["陈家祠地铁站集合", "永庆坊"],
              "meeting_areas": ["陈家祠地铁站 D 口"],
              "budget_min_cents": 8000,
              "budget_max_cents": 15000,
              "tags": ["摄影", "历史"],
              "capacity": 4,
              "note": "走街串巷为主。"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_validVerification_out_verifiedUserAndProfileSchool() throws Exception {
        Session session = register("chsi_valid");
        assertEquals(0, studentVerified(session.userId()), "new accounts start unverified");

        verify(session.token(), "张三", "中山大学", "AB12CD34EF56")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student_verified").value(true))
                .andExpect(jsonPath("$.student_verified_school").doesNotExist())
                .andExpect(jsonPath("$.role").value("USER"));

        assertEquals(1, studentVerified(session.userId()), "verification is persisted");
        assertEquals("中山大学", verifiedSchool(session.userId()), "verified school is stored");

        mockMvc.perform(get("/api/users/{id}/profile", session.userId())
                        .header("X-User-Id", session.userId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student_verified").value(true))
                .andExpect(jsonPath("$.student_verified_school").value("中山大学"))
                .andExpect(jsonPath("$.student_verified_at").value(FixedClockTestConfig.NOW.toString()));
    }

    @Test
    void in_invalidCode_out_invalidInputWithoutWriting() throws Exception {
        Session session = register("chsi_bad_code");

        verify(session.token(), "张三", "中山大学", "12345")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fields.code").value("INVALID_OPTION"));

        assertAll(
                () -> assertEquals(0, studentVerified(session.userId()), "failed verification keeps status"),
                () -> assertNull(verifiedSchool(session.userId()), "failed verification writes no school"));
    }

    @Test
    void in_missingSession_out_unauthorized() throws Exception {
        mockMvc.perform(post(VERIFICATION)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("张三", "中山大学", "AB12CD34EF56")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void in_publishBeforeVerification_out_forbidden_thenVerified_out_created() throws Exception {
        Session session = register("chsi_publish_gate");

        mockMvc.perform(post("/api/trips")
                        .header("X-User-Id", session.userId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TRIP_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("STUDENT_VERIFICATION_REQUIRED"));

        verify(session.token(), "李四", "华南理工大学", "ZZ99YY88XX77").andExpect(status().isOk());

        mockMvc.perform(post("/api/trips")
                        .header("X-User-Id", session.userId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TRIP_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publisher.id").value((int) session.userId()));
    }

    @Test
    void in_applyBeforeVerification_out_forbidden_thenVerified_out_created() throws Exception {
        // 演示账户（id 1）在 V34 中已预置认证，可以直接发布。
        MvcResult created = mockMvc.perform(post("/api/trips")
                        .header("X-User-Id", 1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TRIP_BODY))
                .andExpect(status().isCreated())
                .andReturn();
        Number tripId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        Session applicant = register("chsi_apply_gate");
        mockMvc.perform(post("/api/trips/{tripId}/applications", tripId.longValue())
                        .header("X-User-Id", applicant.userId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\": \"想一起走\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("STUDENT_VERIFICATION_REQUIRED"));

        verify(applicant.token(), "王五", "暨南大学", "QQ11WW22EE33").andExpect(status().isOk());

        mockMvc.perform(post("/api/trips/{tripId}/applications", tripId.longValue())
                        .header("X-User-Id", applicant.userId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\": \"想一起走\"}"))
                .andExpect(status().isCreated());
    }

    private ResultActions verify(
            String token, String name, String school, String code) throws Exception {
        return mockMvc.perform(post(VERIFICATION)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(name, school, code)));
    }

    private static String body(String name, String school, String code) {
        return """
                {
                  "name": "%s",
                  "school": "%s",
                  "code": "%s"
                }
                """.formatted(name, school, code);
    }

    private Session register(String username) throws Exception {
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "routeme-demo",
                                  "nickname": "%s"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.student_verified").value(false))
                .andReturn();
        String content = registered.getResponse().getContentAsString();
        Number userId = JsonPath.read(content, "$.user.id");
        String token = JsonPath.read(content, "$.token");
        return new Session(userId.longValue(), token);
    }

    private int studentVerified(long userId) {
        return jdbcClient.sql("SELECT student_verified FROM app_users WHERE id = :id")
                .param("id", userId)
                .query(Integer.class)
                .single();
    }

    private String verifiedSchool(long userId) {
        return jdbcClient.sql("SELECT student_verified_school FROM app_users WHERE id = :id")
                .param("id", userId)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    private record Session(long userId, String token) {
    }
}
