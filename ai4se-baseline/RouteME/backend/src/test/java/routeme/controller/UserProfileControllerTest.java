package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.pojo.AuthSession;
import routeme.request.AuthRegisterRequest;
import routeme.service.AuthService;

/**
 * 公开资料接口：只读、不要求身份头，返回白名单字段与四项统计。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    @Test
    void in_seededPublisher_out_publicProfileAndStats() throws Exception {
        mockMvc.perform(get("/api/users/2/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.nickname").value("陈屿"))
                .andExpect(jsonPath("$.avatar_initial").value("屿"))
                .andExpect(jsonPath("$.school").value("研一 · 地理科学"))
                .andExpect(jsonPath("$.bio").isNotEmpty())
                .andExpect(jsonPath("$.interests[0]").value("徒步"))
                .andExpect(jsonPath("$.joined_at").value("2026-11-01T10:05:00Z"))
                .andExpect(jsonPath("$.stats.published").value(3))
                .andExpect(jsonPath("$.stats.completed").value(1))
                .andExpect(jsonPath("$.stats.joined").value(2))
                .andExpect(jsonPath("$.stats.shared").value(1));
    }

    @Test
    void in_pendingApplicationAndUnsharedExperience_out_areNotCounted() throws Exception {
        mockMvc.perform(get("/api/users/3/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.published").value(2))
                .andExpect(jsonPath("$.stats.completed").value(0))
                .andExpect(jsonPath("$.stats.joined").value(1))
                .andExpect(jsonPath("$.stats.shared").value(1));
    }

    @Test
    void in_nonStudentDemoUser_out_identityKeptAsIs() throws Exception {
        mockMvc.perform(get("/api/users/4/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("周野"))
                .andExpect(jsonPath("$.school").value("上班族 · 互联网行业 · INFP"))
                .andExpect(jsonPath("$.stats.published").value(1))
                .andExpect(jsonPath("$.stats.completed").value(0))
                .andExpect(jsonPath("$.stats.joined").value(0))
                .andExpect(jsonPath("$.stats.shared").value(0));
    }

    @Test
    void in_registeredAccountWithoutActivity_out_zeroStatsAndNoCredentials() throws Exception {
        AuthSession session = authService.register(new AuthRegisterRequest(
                "profileviewer",
                "routeme-demo",
                "新同伴",
                null,
                "大一 · 数学",
                "还没出发。",
                List.of("城市漫步")));

        mockMvc.perform(get("/api/users/" + session.userId() + "/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("新同伴"))
                .andExpect(jsonPath("$.stats.published").value(0))
                .andExpect(jsonPath("$.stats.completed").value(0))
                .andExpect(jsonPath("$.stats.joined").value(0))
                .andExpect(jsonPath("$.stats.shared").value(0))
                .andExpect(jsonPath("$.username").doesNotExist())
                .andExpect(jsonPath("$.password_hash").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void in_unknownUser_out_userNotFound() throws Exception {
        mockMvc.perform(get("/api/users/999/profile"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }
}
