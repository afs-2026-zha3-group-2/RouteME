package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import routeme.stub.UpstreamStubs;

/**
 * 备用预报链路：主用预报主机连不上（连接被拒绝）时自动切到同一数据源的集合预报接口。
 *
 * <p>独立 context：主用地址指向一个必然拒绝连接的端口，备用地址指向本地替身，
 * 用真实「连接层失败」触发降级，而不是靠 HTTP 错误码。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
class WeatherFallbackTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    private static final String DEAD_BASE_URL = "http://127.0.0.1:1";
    private static final String DATE = LocalDate.now(ZONE).plusDays(2).toString();

    @DynamicPropertySource
    static void weatherProperties(DynamicPropertyRegistry registry) {
        registry.add("routeme.weather.base-url", () -> DEAD_BASE_URL);
        registry.add("routeme.weather.fallback-base-url", UpstreamStubs::weatherBaseUrl);
    }

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void resetUpstream() {
        UpstreamStubs.reset();
        UpstreamStubs.weatherBody = """
                {"daily":{"time":["%s"],"temperature_2m_max":[26.0],"temperature_2m_min":[18.0],
                 "precipitation_sum":[0.0],"weather_code":[1],"wind_speed_10m_max":[9.0],"uv_index_max":[4.0]}}
                """.formatted(DATE);
    }

    @Test
    void in_primaryHostUnreachable_out_servesEnsembleForecast() throws Exception {
        mockMvc.perform(get("/api/weather/forecast")
                        .param("lng", "113.2644")
                        .param("lat", "23.1291")
                        .param("date", DATE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.source").value("open-meteo"))
                .andExpect(jsonPath("$.weather.temp_max_c").value(26.0))
                .andExpect(jsonPath("$.weather.temp_min_c").value(18.0))
                .andExpect(jsonPath("$.weather.precipitation_probability_pct").doesNotExist());

        assertEquals(1, UpstreamStubs.WEATHER_QUERIES.size(), "fallback endpoint should be called once");
        assertTrue(
                UpstreamStubs.WEATHER_QUERIES.getFirst().contains("models=icon_seamless"),
                "fallback must request a named ensemble model");
    }

    @Test
    void in_primaryHostStillUnreachable_out_keepsServingEnsemble() throws Exception {
        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(get("/api/weather/forecast")
                            .param("lng", "113.2644")
                            .param("lat", "23.1291")
                            .param("date", DATE))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.available").value(true));
        }

        assertEquals(2, UpstreamStubs.WEATHER_QUERIES.size(), "both requests should be served by the fallback");
    }
}