package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * 体验赞数与点赞态的展示验收：列表 / 行程详情 / 我的体验三处同源，视角不同结果不同。
 *
 * <p>种子数据：体验 1 由用户 2 发布（行程 1），体验 2 由用户 3 发布（行程 2）。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExperienceLikeDisplayApiTest {

    private static final long EXPERIENCE = 1L;
    private static final long AUTHOR = 2L;
    private static final long LIKER = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_likedExperience_out_sameStatsOnThreeEndpoints() throws Exception {
        // Given
        mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", LIKER))
                .andExpect(status().isCreated());

        // When / Then 首页列表（最近更新的体验在前）
        mockMvc.perform(get("/api/experiences").header("X-User-Id", LIKER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(EXPERIENCE))
                .andExpect(jsonPath("$.items[0].like_count").value(1))
                .andExpect(jsonPath("$.items[0].is_liked").value(true))
                .andExpect(jsonPath("$.items[1].like_count").value(0))
                .andExpect(jsonPath("$.items[1].is_liked").value(false));

        // 行程详情
        mockMvc.perform(get("/api/trips/{tripId}/experiences", 1).header("X-User-Id", LIKER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(EXPERIENCE))
                .andExpect(jsonPath("$[0].like_count").value(1))
                .andExpect(jsonPath("$[0].is_liked").value(true));

        // 我的体验：作者视角，自己的体验不可赞
        mockMvc.perform(get("/api/me/experiences").header("X-User-Id", AUTHOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(EXPERIENCE))
                .andExpect(jsonPath("$[0].like_count").value(1))
                .andExpect(jsonPath("$[0].is_liked").value(false));

        // 未点赞的第三方视角
        mockMvc.perform(get("/api/trips/{tripId}/experiences", 1).header("X-User-Id", 3))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].like_count").value(1))
                .andExpect(jsonPath("$[0].is_liked").value(false));
    }
}
