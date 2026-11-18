package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

/** 管理员删除任意旅行灵感：权限、子表清理与 404。 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class AdminExperienceDeleteApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_adminDeletesExperience_out_childrenRemovedAndListShrinks() throws Exception {
        String admin = login("admin", "admin12345");
        // 给 1 号体验造一条点赞与一张图片，验证外键子表先被清理。
        jdbcClient.sql("""
                INSERT INTO experience_likes (id, experience_id, user_id, created_at)
                VALUES (990001, 1, 2, '2026-11-16T09:00:00Z')
                """).update();
        jdbcClient.sql("""
                INSERT INTO trip_experience_photos
                    (id, trip_id, author_id, experience_id, file_name, mime, bytes, sort_order, created_at)
                VALUES (990001, 1, 1, 1, 'admin-delete.jpg', 'image/jpeg', 10, 0, '2026-11-16T09:00:00Z')
                """).update();

        mockMvc.perform(delete("/api/admin/experiences/1").header("Authorization", bearer(admin)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(2));
        assertEquals(0, jdbcClient
                .sql("SELECT COUNT(*) FROM experience_likes WHERE experience_id = 1")
                .query(Integer.class).single());
        assertEquals(0, jdbcClient
                .sql("SELECT COUNT(*) FROM trip_experience_photos WHERE experience_id = 1")
                .query(Integer.class).single());
    }

    @Test
    void in_normalUser_out_forbiddenAndKeepsExperience() throws Exception {
        String user = login("linjianxia", "123456");

        mockMvc.perform(delete("/api/admin/experiences/1").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_REQUIRED"));

        mockMvc.perform(get("/api/trips/1/experiences").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void in_missingExperience_out_notFound() throws Exception {
        String admin = login("admin", "admin12345");

        mockMvc.perform(delete("/api/admin/experiences/999999").header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_NOT_FOUND"));
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
}
