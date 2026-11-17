package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.entity.UserCreditAccountEntity;
import routeme.mapper.UserCreditAccountMapper;

/**
 * 十档边界：分数落在 90 / 80 / 60 / 30 的边界上时，等级按左闭右开区间派生。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CreditBoundaryApiTest {

    private static final long TARGET = 1L;
    private static final long CALLER = 2L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserCreditAccountMapper accountMapper;

    @Test
    void in_tenBoundaryScores_out_expectedLevelCodes() throws Exception {
        Map<Integer, String> expectations = new LinkedHashMap<>();
        expectations.put(100, "excellent");
        expectations.put(90, "excellent");
        expectations.put(89, "good");
        expectations.put(80, "good");
        expectations.put(79, "fair");
        expectations.put(60, "fair");
        expectations.put(59, "low");
        expectations.put(30, "low");
        expectations.put(29, "risk");
        expectations.put(0, "risk");

        for (Map.Entry<Integer, String> expectation : expectations.entrySet()) {
            seedScore(expectation.getKey());
            mockMvc.perform(get("/api/users/{userId}/profile", TARGET)
                            .header("X-User-Id", CALLER))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.credit_score").value(expectation.getKey()))
                    .andExpect(jsonPath("$.credit_level").value(expectation.getValue()));
        }
    }

    private void seedScore(int score) {
        UserCreditAccountEntity entity = accountMapper.selectById(TARGET);
        entity.setScore(score);
        accountMapper.updateById(entity);
    }
}
