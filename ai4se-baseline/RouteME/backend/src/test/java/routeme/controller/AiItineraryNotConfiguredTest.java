package routeme.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.stub.UpstreamStubs;

/**
 * B2：AI key 未配置（空白）时 generate 返回 503 AI_NOT_CONFIGURED。
 * 独立 context：api-key 置空，与主测试类的替身配置隔离。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class AiItineraryNotConfiguredTest {

    @DynamicPropertySource
    static void upstreams(DynamicPropertyRegistry registry) {
        registry.add("routeme.ai.base-url", UpstreamStubs::aiBaseUrl);
        registry.add("routeme.ai.api-key", () -> "");
        registry.add("routeme.weather.base-url", UpstreamStubs::weatherBaseUrl);
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_blankApiKey_out_aiNotConfigured() throws Exception {
        UpstreamStubs.reset();
        mockMvc.perform(post("/api/ai/itineraries/generate")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "origin": { "name": "广州南站", "lng": 113.269, "lat": 22.989 },
                                  "destination": { "name": "广州市", "lng": 113.264, "lat": 23.129 },
                                  "date": "2026-11-21"
                                }
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("AI_NOT_CONFIGURED"));
        org.junit.jupiter.api.Assertions.assertEquals(
                0, UpstreamStubs.AI_CALLS.get(), "no upstream call without a key");
    }
}