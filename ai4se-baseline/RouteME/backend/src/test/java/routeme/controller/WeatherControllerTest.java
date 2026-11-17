package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.stub.UpstreamStubs;

/**
 * 天气代理（B5 / B6 forecast 路径）：Open-Meteo 走 {@link UpstreamStubs}，
 * 固定时钟「今天」2026-11-16，预报窗口至 2026-12-01。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class WeatherControllerTest {

    @DynamicPropertySource
    static void upstreams(DynamicPropertyRegistry registry) {
        registry.add("routeme.weather.base-url", UpstreamStubs::weatherBaseUrl);
    }

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void resetStubs() {
        UpstreamStubs.reset();
    }

    @Test
    void in_destinationAndDate_out_normalizedForecast() throws Exception {
        forecast("113.264", "23.129", "2026-11-21", "1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-11-21"))
                .andExpect(jsonPath("$.temp_max_c").value(24.0))
                .andExpect(jsonPath("$.temp_min_c").value(17.0))
                .andExpect(jsonPath("$.precipitation_probability_pct").value(20))
                .andExpect(jsonPath("$.precipitation_mm").value(0.0))
                .andExpect(jsonPath("$.weather_code").value(1))
                .andExpect(jsonPath("$.weather_text").value("多云"))
                .andExpect(jsonPath("$.wind_speed_kmh").value(12.5))
                .andExpect(jsonPath("$.uv_index").value(6.0))
                .andExpect(jsonPath("$.source").value("open-meteo"));

        String query = String.join("&", UpstreamStubs.WEATHER_QUERIES);
        assertTrue(query.contains("latitude=23.129"), "latitude forwarded");
        assertTrue(query.contains("longitude=113.264"), "longitude forwarded");
        assertTrue(query.contains("start_date=2026-11-21"), "start_date forwarded");
        assertTrue(query.contains("end_date=2026-11-21"), "end_date forwarded");
    }

    @Test
    void in_uvUnavailable_out_nullUvIndex() throws Exception {
        UpstreamStubs.weatherBody = UpstreamStubs.DEFAULT_WEATHER_BODY.replace("[6.0]", "[null]");
        forecast("113.264", "23.129", "2026-11-21", "1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uv_index").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.temp_max_c").value(24.0));
    }

    @Test
    void in_dateBeyondWindow_out_invalidInput() throws Exception {
        forecast("113.264", "23.129", "2026-12-02", "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        assertTrue(UpstreamStubs.WEATHER_QUERIES.isEmpty(), "out-of-window date must not hit upstream");
    }

    @Test
    void in_pastDate_out_invalidInput() throws Exception {
        forecast("113.264", "23.129", "2026-11-15", "1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_upstreamFailure_out_weatherUpstreamError() throws Exception {
        UpstreamStubs.weatherStatus = 500;
        forecast("113.264", "23.129", "2026-11-21", "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("WEATHER_UPSTREAM_ERROR"));
    }

    @Test
    void in_noDataForRequestedDay_out_weatherUpstreamError() throws Exception {
        UpstreamStubs.weatherBody = UpstreamStubs.DEFAULT_WEATHER_BODY.replace("2026-11-21", "2026-11-22");
        forecast("113.264", "23.129", "2026-11-21", "1")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("WEATHER_UPSTREAM_ERROR"));
    }

    @Test
    void in_missingDate_out_invalidInput() throws Exception {
        mockMvc.perform(get("/api/weather/forecast")
                        .header("X-User-Id", "1")
                        .param("lng", "113.264")
                        .param("lat", "23.129"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        forecast("113.264", "23.129", "2026-11-21", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    private ResultActions forecast(String lng, String lat, String date, String userId) throws Exception {
        var request = get("/api/weather/forecast")
                .param("lng", lng)
                .param("lat", lat)
                .param("date", date);
        if (userId != null) {
            request.header("X-User-Id", userId);
        }
        return mockMvc.perform(request);
    }
}