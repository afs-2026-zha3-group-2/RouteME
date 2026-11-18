package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.stub.UpstreamStubs;

/**
 * AI 生成代理（B1–B4 / B6 generate 路径）：上游全部走 {@link UpstreamStubs}，
 * 固定时钟下「今天」为 2026-11-16，测试日期 2026-11-21 在预报窗口内。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class AiItineraryControllerTest {

    private static final String GENERATE = """
            {
              "origin": { "name": "广州南站", "lng": 113.269, "lat": 22.989 },
              "destination": { "name": "广州市", "lng": 113.264, "lat": 23.129 },
              "date": "2026-11-21",
              "duration": "one_day",
              "budget_cents": 50000,
              "travel_mode": "transit",
              "interests": ["美食", "摄影"],
              "pace": "moderate",
              "reduce_budget": false
            }
            """;

    @DynamicPropertySource
    static void upstreams(DynamicPropertyRegistry registry) {
        registry.add("routeme.ai.base-url", UpstreamStubs::aiBaseUrl);
        registry.add("routeme.ai.api-key", () -> "test-key");
        registry.add("routeme.ai.timeout-seconds", () -> "1");
        registry.add("routeme.weather.base-url", UpstreamStubs::weatherBaseUrl);
        registry.add("routeme.weather.fallback-base-url", UpstreamStubs::weatherBaseUrl);
    }

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void resetStubs() {
        UpstreamStubs.reset();
    }

    @Test
    void in_validConditions_out_planWithRealWeather() throws Exception {
        generate(GENERATE, "1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan.title").value("广州 1 日游"))
                .andExpect(jsonPath("$.plan.days[0].day").value(1))
                .andExpect(jsonPath("$.plan.days[0].stops.length()").value(4))
                .andExpect(jsonPath("$.plan.days[0].stops[0].name").value("广州塔"))
                .andExpect(jsonPath("$.plan.days[0].stops[0].reason").exists())
                .andExpect(jsonPath("$.plan.days[0].stops[0].arrival").value("09:00"))
                .andExpect(jsonPath("$.plan.days[0].stops[0].stay_minutes").value(120))
                .andExpect(jsonPath("$.plan.days[0].stops[0].indoor").value(false))
                .andExpect(jsonPath("$.plan.tips.length()").value(1))
                .andExpect(jsonPath("$.plan.packing[0]").value("防晒霜"))
                .andExpect(jsonPath("$.plan.budget.transport_cents").value(8000))
                .andExpect(jsonPath("$.plan.budget.total_cents").value(46000))
                .andExpect(jsonPath("$.weather.date").value("2026-11-21"))
                .andExpect(jsonPath("$.weather.available").value(true))
                .andExpect(jsonPath("$.weather.weather.temp_max_c").value(24.0))
                .andExpect(jsonPath("$.weather.weather.temp_min_c").value(17.0))
                .andExpect(jsonPath("$.weather.weather.precipitation_probability_pct").value(20))
                .andExpect(jsonPath("$.weather.weather.weather_text").value("多云"))
                .andExpect(jsonPath("$.weather.source").value("open-meteo"));
    }

    @Test
    void in_generate_out_promptCarriesWeatherBudgetAndMapBan() throws Exception {
        generate(GENERATE, "1").andExpect(status().isOk());

        String prompt = String.join("\n", UpstreamStubs.AI_BODIES);
        assertTrue(prompt.contains("24"), "prompt should carry the real max temperature");
        assertTrue(prompt.contains("降雨概率"), "prompt should carry the rain probability");
        assertTrue(prompt.contains("500"), "prompt should carry the user budget in yuan");
        assertTrue(prompt.contains("经纬度"), "prompt should forbid map data output");
        assertTrue(prompt.contains("广州南站"), "prompt should carry the origin");
        assertTrue(prompt.contains("美食"), "prompt should carry the interests");
    }

    @Test
    void in_reduceBudget_out_promptDemandsBudgetCap() throws Exception {
        generate(GENERATE.replace("\"reduce_budget\": false", "\"reduce_budget\": true"), "1")
                .andExpect(status().isOk());

        String prompt = String.join("\n", UpstreamStubs.AI_BODIES);
        assertTrue(prompt.contains("不得超过"), "reduce_budget should demand a hard budget cap");
    }

    @Test
    void in_upstreamFailure_out_aiUpstreamError() throws Exception {
        UpstreamStubs.aiStatus = 500;
        generate(GENERATE, "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("AI_UPSTREAM_ERROR"));
    }

    @Test
    void in_upstreamTimeout_out_aiUpstreamError() throws Exception {
        UpstreamStubs.aiDelayMs = 2500;
        generate(GENERATE, "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("AI_UPSTREAM_ERROR"));
    }

    @Test
    void in_nonJsonOutput_out_invalidOutputWithoutRetry() throws Exception {
        UpstreamStubs.aiContent = "这不是 JSON";
        generate(GENERATE, "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("AI_INVALID_OUTPUT"));
        assertEquals(1, UpstreamStubs.AI_CALLS.get(), "invalid output must not auto-retry");
    }

    @Test
    void in_missingBudgetField_out_invalidOutput() throws Exception {
        UpstreamStubs.aiContent = """
                { "title": "广州 1 日游",
                  "days": [ { "day": 1, "stops": [
                    { "name": "广州塔", "reason": "地标", "arrival": "09:00", "stay_minutes": 120, "indoor": false },
                    { "name": "海心沙", "reason": "江景", "arrival": "11:30", "stay_minutes": 60, "indoor": false }
                  ] } ],
                  "tips": [], "packing": [] }
                """;
        generate(GENERATE, "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("AI_INVALID_OUTPUT"));
    }

    @Test
    void in_singlePoi_out_invalidOutput() throws Exception {
        UpstreamStubs.aiContent = """
                { "title": "广州 1 日游",
                  "days": [ { "day": 1, "stops": [
                    { "name": "广州塔", "reason": "地标", "arrival": "09:00", "stay_minutes": 120, "indoor": false }
                  ] } ],
                  "tips": [], "packing": [],
                  "budget": { "transport_cents": 100, "tickets_cents": 100,
                              "food_cents": 100, "other_cents": 100, "total_cents": 400 } }
                """;
        generate(GENERATE, "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("AI_INVALID_OUTPUT"));
    }

    @Test
    void in_markdownFencedJson_out_parsed() throws Exception {
        UpstreamStubs.aiContent = "```json\n" + UpstreamStubs.DEFAULT_AI_CONTENT + "\n```";
        generate(GENERATE, "1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan.days[0].stops.length()").value(4));
    }

    @Test
    void in_budgetTotalMismatch_out_recomputedTotal() throws Exception {
        UpstreamStubs.aiContent = UpstreamStubs.DEFAULT_AI_CONTENT.replace("\"total_cents\": 46000", "\"total_cents\": 1");
        generate(GENERATE, "1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan.budget.total_cents").value(46000));
    }

    @Test
    void in_weatherUpstreamFailure_out_weatherUpstreamError() throws Exception {
        UpstreamStubs.weatherStatus = 500;
        generate(GENERATE, "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("WEATHER_UPSTREAM_ERROR"));
        assertEquals(0, UpstreamStubs.AI_CALLS.get(), "AI must not be called when weather fails");
    }

    @Test
    void in_dateBeyondForecastWindow_out_invalidInput() throws Exception {
        generate(GENERATE.replace("\"2026-11-21\"", "\"2026-12-02\""), "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingDestination_out_invalidInput() throws Exception {
        String body = GENERATE.replace(
                "\"destination\": { \"name\": \"广州市\", \"lng\": 113.264, \"lat\": 23.129 },", "");
        generate(body, "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        generate(GENERATE, null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    private ResultActions generate(String body, String userId) throws Exception {
        var request = post("/api/ai/itineraries/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
        if (userId != null) {
            request.header("X-User-Id", userId);
        }
        return mockMvc.perform(request);
    }
}