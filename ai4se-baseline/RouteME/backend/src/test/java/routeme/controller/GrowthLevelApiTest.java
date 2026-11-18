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
 * 等级派生边界：99 / 100 / 399 / 400 / 450 与扣减后的回退。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GrowthLevelApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Test
    void in_boundaryExp_out_expectedLevelsAndProgress() throws Exception {
        assertLevel(99, 1, 1, false);
        assertLevel(100, 2, 100, false);
        assertLevel(399, 4, 1, false);
        assertLevel(400, 5, null, true);
    }

    @Test
    void in_expAboveMax_out_levelStaysFiveAndExpKeepsGrowing() throws Exception {
        assertLevel(450, 5, null, true);
    }

    @Test
    void in_expDrops_out_levelFallsBack() throws Exception {
        assertLevel(120, 2, 80, false);
        assertLevel(70, 1, 30, false);
    }

    private void assertLevel(int exp, int level, Integer expToNext, boolean maxLevel) throws Exception {
        seedExp(exp);
        var result = mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.growth.level").value(level))
                .andExpect(jsonPath("$.growth.exp").value(exp))
                .andExpect(jsonPath("$.growth.max_level").value(maxLevel));
        if (expToNext == null) {
            result.andExpect(jsonPath("$.growth.exp_to_next").doesNotExist());
        } else {
            result.andExpect(jsonPath("$.growth.exp_to_next").value(expToNext));
        }
    }

    private void seedExp(int exp) {
        UserGrowthAccountEntity entity = accountMapper.selectById(1L);
        entity.setExpTotal(exp);
        accountMapper.updateById(entity);
    }
}
