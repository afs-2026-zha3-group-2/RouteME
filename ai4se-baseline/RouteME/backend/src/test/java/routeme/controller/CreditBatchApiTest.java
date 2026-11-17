package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Collectors;
import java.util.stream.LongStream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * 批量信用状态端点：顺序、缺失账户补齐、鉴权与上限。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CreditBatchApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_threeSeededIds_out_orderedEightyGood() throws Exception {
        mockMvc.perform(get("/api/users/credits").param("ids", "1,2,3").header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].user_id").value(1))
                .andExpect(jsonPath("$[0].credit_score").value(80))
                .andExpect(jsonPath("$[0].credit_level").value("good"))
                .andExpect(jsonPath("$[2].user_id").value(3));
    }

    @Test
    void in_accountWithoutCreditRow_out_initialisedEighty() throws Exception {
        mockMvc.perform(get("/api/users/credits").param("ids", "999").header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].user_id").value(999))
                .andExpect(jsonPath("$[0].credit_score").value(80))
                .andExpect(jsonPath("$[0].credit_level").value("good"));
    }

    @Test
    void in_missingCaller_out_unauthorized() throws Exception {
        mockMvc.perform(get("/api/users/credits").param("ids", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_moreThanFiftyIds_out_badRequest() throws Exception {
        String ids = LongStream.rangeClosed(1, 51).mapToObj(Long::toString).collect(Collectors.joining(","));
        mockMvc.perform(get("/api/users/credits").param("ids", ids).header("X-User-Id", 1L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_nonNumericId_out_badRequest() throws Exception {
        mockMvc.perform(get("/api/users/credits").param("ids", "1,abc").header("X-User-Id", 1L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_duplicateIds_out_singleEntryPerUser() throws Exception {
        mockMvc.perform(get("/api/users/credits").param("ids", "2,2,3").header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].user_id").value(2))
                .andExpect(jsonPath("$[1].user_id").value(3));
    }
}
