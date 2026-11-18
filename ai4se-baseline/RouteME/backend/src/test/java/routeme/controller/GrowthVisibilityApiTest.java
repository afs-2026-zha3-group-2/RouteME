package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.entity.UserGrowthAccountEntity;
import routeme.mapper.UserGrowthAccountMapper;

/**
 * C2 字段级可见性：本人可见等级与经验进度，他人只可见等级、不返回经验或明细。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GrowthVisibilityApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Test
    void in_selfProfile_out_levelWithExpProgress() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.growth.level").value(1))
                .andExpect(jsonPath("$.growth.exp").value(0))
                .andExpect(jsonPath("$.growth.exp_to_next").value(100))
                .andExpect(jsonPath("$.growth.max_level").value(false));
    }

    @Test
    void in_otherProfile_out_levelOnlyWithoutExp() throws Exception {
        seedAccount(2L, 240);

        mockMvc.perform(get("/api/users/{userId}/profile", 2L).header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.growth.level").value(3))
                .andExpect(jsonPath("$.growth.exp").doesNotExist())
                .andExpect(jsonPath("$.growth.exp_to_next").doesNotExist())
                .andExpect(jsonPath("$.growth.max_level").doesNotExist());
    }

    @Test
    void in_lv5SelfProfile_out_maxLevelWithoutNext() throws Exception {
        seedAccount(1L, 400);

        mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.growth.level").value(5))
                .andExpect(jsonPath("$.growth.exp").value(400))
                .andExpect(jsonPath("$.growth.max_level").value(true))
                .andExpect(jsonPath("$.growth.exp_to_next").doesNotExist());
    }

    private void seedAccount(long userId, int exp) {
        UserGrowthAccountEntity entity = accountMapper.selectById(userId);
        entity.setExpTotal(exp);
        accountMapper.updateById(entity);
    }
}
