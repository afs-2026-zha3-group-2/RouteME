package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

/**
 * 天气接口：Open-Meteo 预报与地理编码都走本地替身，不依赖外网与真实 Key。
 *
 * <p>缓存与计数用例使用互不相同的城市码，避免单例缓存互相影响。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
class WeatherControllerTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    private static final Pattern START_DATE = Pattern.compile("start_date=(\\d{4}-\\d{2}-\\d{2})");

    private static final AtomicInteger GEOCODING_CALLS = new AtomicInteger();
    private static final AtomicInteger FORECAST_CALLS = new AtomicInteger();
    private static final AtomicInteger ENSEMBLE_CALLS = new AtomicInteger();
    private static final AtomicReference<UpstreamMode> MODE = new AtomicReference<>(UpstreamMode.OK);
    private static final String BASE_URL;

    private static final HttpServer SERVER;

    static {
        try {
            SERVER = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException error) {
            throw new ExceptionInInitializerError(error);
        }
        SERVER.createContext("/v1/search", WeatherControllerTest::handleGeocoding);
        SERVER.createContext("/v1/forecast", WeatherControllerTest::handleForecast);
        SERVER.createContext("/v1/ensemble", WeatherControllerTest::handleEnsemble);
        SERVER.start();
        BASE_URL = "http://127.0.0.1:" + SERVER.getAddress().getPort();
    }

    @DynamicPropertySource
    static void weatherProperties(DynamicPropertyRegistry registry) {
        registry.add("routeme.weather.base-url", () -> BASE_URL);
        registry.add("routeme.weather.geocoding-base-url", () -> BASE_URL);
        registry.add("routeme.weather.fallback-base-url", () -> BASE_URL);
    }

    @Autowired
    private MockMvc mockMvc;

    @AfterEach
    void resetUpstream() {
        MODE.set(UpstreamMode.OK);
    }

    @Test
    void in_coordinatesAndDate_out_returnsRealWeather() throws Exception {
        // Given
        String date = LocalDate.now(ZONE).plusDays(2).toString();

        // When / Then
        mockMvc.perform(get("/api/weather/forecast")
                        .param("lng", "113.2644")
                        .param("lat", "23.1291")
                        .param("date", date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value(date))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.source").value("open-meteo"))
                .andExpect(jsonPath("$.weather.weather_code").value(61))
                .andExpect(jsonPath("$.weather.weather_text").value("小雨"))
                .andExpect(jsonPath("$.weather.temp_max_c").value(24.0))
                .andExpect(jsonPath("$.weather.temp_min_c").value(17.0))
                .andExpect(jsonPath("$.weather.precipitation_probability_pct").value(80))
                .andExpect(jsonPath("$.weather.precipitation_mm").value(5.2))
                .andExpect(jsonPath("$.weather.wind_speed_kmh").value(18.0))
                .andExpect(jsonPath("$.weather.uv_index").value(3.0))
                .andExpect(jsonPath("$.reminders[0].code").value("rain"));
    }

    @Test
    void in_destinationCodeOnly_out_geocodesOnceAndCaches() throws Exception {
        // Given
        String date = LocalDate.now(ZONE).plusDays(1).toString();
        int before = GEOCODING_CALLS.get();

        // When
        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "440300")
                        .param("date", date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.lng").value(113.2644))
                .andExpect(jsonPath("$.lat").value(23.1291));
        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "440300")
                        .param("date", date))
                .andExpect(status().isOk());

        // Then
        assertEquals(1, GEOCODING_CALLS.get() - before, "geocoding should be cached per city");
    }

    @Test
    void in_dateBeforeToday_out_unavailableWithoutCallingUpstream() throws Exception {
        int geocodingBefore = GEOCODING_CALLS.get();
        int forecastBefore = FORECAST_CALLS.get();
        String date = LocalDate.now(ZONE).minusDays(1).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "440600")
                        .param("date", date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.reason").value("OUT_OF_RANGE"))
                .andExpect(jsonPath("$.weather").doesNotExist())
                .andExpect(jsonPath("$.reminders").isEmpty());

        assertEquals(geocodingBefore, GEOCODING_CALLS.get(), "out of range must not geocode");
        assertEquals(forecastBefore, FORECAST_CALLS.get(), "out of range must not call forecast");
    }

    @Test
    void in_dateBeyondWindow_out_unavailable() throws Exception {
        String date = LocalDate.now(ZONE).plusDays(16).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "440600")
                        .param("date", date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.reason").value("OUT_OF_RANGE"));
    }

    @Test
    void in_windowBoundaries_out_available() throws Exception {
        String today = LocalDate.now(ZONE).toString();
        String lastDay = LocalDate.now(ZONE).plusDays(15).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "110100")
                        .param("date", today))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "110100")
                        .param("date", lastDay))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void in_upstreamError_out_badGateway() throws Exception {
        MODE.set(UpstreamMode.ERROR);
        String date = LocalDate.now(ZONE).plusDays(1).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "510100")
                        .param("date", date))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("WEATHER_UPSTREAM_ERROR"))
                .andExpect(jsonPath("$.weather").doesNotExist());
    }

    @Test
    void in_noDataForRequestedDate_out_badGateway() throws Exception {
        MODE.set(UpstreamMode.NO_DATA);
        String date = LocalDate.now(ZONE).plusDays(1).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "510100")
                        .param("date", date))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("WEATHER_UPSTREAM_ERROR"));
    }

    @Test
    void in_primaryForecastError_out_fallsBackToEnsemble() throws Exception {
        // Given：主用接口 500，备用集合接口正常；用坐标绕开地理编码替身。
        MODE.set(UpstreamMode.PRIMARY_ERROR);
        String date = LocalDate.now(ZONE).plusDays(3).toString();
        int ensembleBefore = ENSEMBLE_CALLS.get();

        // When / Then
        mockMvc.perform(get("/api/weather/forecast")
                        .param("lng", "113.2644")
                        .param("lat", "23.1291")
                        .param("date", date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.source").value("open-meteo"))
                .andExpect(jsonPath("$.weather.temp_max_c").value(22.0))
                .andExpect(jsonPath("$.weather.temp_min_c").value(15.0))
                .andExpect(jsonPath("$.weather.weather_code").value(2))
                .andExpect(jsonPath("$.weather.precipitation_probability_pct").doesNotExist());
        assertEquals(ensembleBefore + 1, ENSEMBLE_CALLS.get(), "fallback endpoint should serve the forecast");
    }

    @Test
    void in_missingDate_out_badRequest() throws Exception {
        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "440100"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_halfCoordinatePair_out_badRequest() throws Exception {
        String date = LocalDate.now(ZONE).plusDays(1).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("lng", "113.26")
                        .param("date", date))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_unsupportedDestinationCode_out_badRequest() throws Exception {
        String date = LocalDate.now(ZONE).plusDays(1).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("destination_code", "999999")
                        .param("date", date))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_coordinatesOutOfRange_out_badRequest() throws Exception {
        String date = LocalDate.now(ZONE).plusDays(1).toString();

        mockMvc.perform(get("/api/weather/forecast")
                        .param("lng", "200")
                        .param("lat", "23")
                        .param("date", date))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    /** 替身模式：正常 / 上游 500 / 没有请求日数据 / 仅主用接口 500。 */
    private enum UpstreamMode {
        OK,
        ERROR,
        NO_DATA,
        PRIMARY_ERROR
    }

    private static void handleGeocoding(HttpExchange exchange) throws IOException {
        GEOCODING_CALLS.incrementAndGet();
        if (MODE.get() == UpstreamMode.ERROR) {
            exchange.sendResponseHeaders(500, -1);
            exchange.close();
            return;
        }
        respond(exchange, """
                {"results":[{"name":"广州","latitude":23.1291,"longitude":113.2644,
                "country":"China","admin1":"Guangdong"}]}""");
    }

    private static void handleForecast(HttpExchange exchange) throws IOException {
        FORECAST_CALLS.incrementAndGet();
        String startDate = startDateOf(exchange);
        if (MODE.get() == UpstreamMode.ERROR || MODE.get() == UpstreamMode.PRIMARY_ERROR) {
            exchange.sendResponseHeaders(500, -1);
            exchange.close();
            return;
        }
        if (MODE.get() == UpstreamMode.NO_DATA) {
            respond(exchange, """
                    {"daily":{"time":["2020-01-01"],
                    "temperature_2m_max":[20.0],"temperature_2m_min":[10.0]}}""");
            return;
        }
        respond(exchange, """
                {"latitude":23.1291,"longitude":113.2644,
                 "daily":{"time":["%s"],
                 "temperature_2m_max":[24.0],"temperature_2m_min":[17.0],
                 "precipitation_probability_max":[80],"precipitation_sum":[5.2],
                 "weather_code":[61],"wind_speed_10m_max":[18.0],"uv_index_max":[3.0]}}"""
                .formatted(startDate));
    }

    /** 备用集合接口：字段与主用接口同名，但不提供降雨概率。 */
    private static void handleEnsemble(HttpExchange exchange) throws IOException {
        ENSEMBLE_CALLS.incrementAndGet();
        String startDate = startDateOf(exchange);
        if (MODE.get() == UpstreamMode.ERROR) {
            exchange.sendResponseHeaders(500, -1);
            exchange.close();
            return;
        }
        if (MODE.get() == UpstreamMode.NO_DATA) {
            respond(exchange, """
                    {"daily":{"time":["2020-01-01"],
                    "temperature_2m_max":[20.0],"temperature_2m_min":[10.0]}}""");
            return;
        }
        respond(exchange, """
                {"daily":{"time":["%s"],
                 "temperature_2m_max":[22.0],"temperature_2m_min":[15.0],
                 "precipitation_sum":[0.0],"weather_code":[2],
                 "wind_speed_10m_max":[10.0],"uv_index_max":[5.0]}}"""
                .formatted(startDate));
    }

    private static String startDateOf(HttpExchange exchange) {
        String rawQuery = exchange.getRequestURI().getRawQuery();
        Matcher matcher = START_DATE.matcher(rawQuery == null ? "" : rawQuery);
        return matcher.find() ? matcher.group(1) : LocalDate.now(ZONE).toString();
    }

    private static void respond(HttpExchange exchange, String body) throws IOException {
        byte[] payload = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(200, payload.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(payload);
        }
    }
}