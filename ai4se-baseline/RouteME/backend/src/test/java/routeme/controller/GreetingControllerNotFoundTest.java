package routeme.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import routeme.dao.GreetingRepository;

@SpringBootTest
@AutoConfigureMockMvc
class GreetingControllerNotFoundTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GreetingRepository greetingRepository;

    /**
     * 问候语缺失时按契约返回 404 与 GREETING_NOT_FOUND。
     */
    @Test
    void in_missingGreeting_out_greetingNotFound() throws Exception {
        // Given
        when(greetingRepository.findGreeting()).thenReturn(Optional.empty());

        // When
        // 请求 GET /api/greeting

        // Then
        mockMvc.perform(get("/api/greeting"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GREETING_NOT_FOUND"));
    }
}
