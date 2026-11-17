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

/**
 * 存量账号回填与本人 / 他人同口径：任意视角都能读到 80 / good。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CreditProfileApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_selfProfile_out_eightyGood() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.credit_level").value("good"));
    }

    @Test
    void in_otherProfile_out_sameCreditValues() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 2L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.credit_level").value("good"))
                .andExpect(jsonPath("$.birthday").doesNotExist());
    }

    @Test
    void in_demoViewerProfile_out_eightyGood() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 4L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.credit_level").value("good"));
    }
}
