package routeme.stub;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.ObjectMapper;

/**
 * AI / Open-Meteo 上游测试替身（JDK HttpServer，ephemeral 端口）。
 *
 * <p>端口在 Spring context 创建前就已确定，测试类用 {@code @DynamicPropertySource}
 * 把 {@code routeme.ai.base-url} / {@code routeme.weather.base-url} 指到这里；
 * 不依赖真实 DeepSeek / Open-Meteo key。替身记录请求体与调用次数，供提示词与
 * 「非法输出不自动重试」断言使用。
 */
public final class UpstreamStubs {

    /** 默认 AI 输出：广州一日游，4 个 POI，预算合计 460 元。 */
    public static final String DEFAULT_AI_CONTENT = """
            {
              "title": "广州 1 日游",
              "days": [ { "day": 1, "stops": [
                { "name": "广州塔", "reason": "城市地标，俯瞰珠江", "arrival": "09:00", "stay_minutes": 120, "indoor": false },
                { "name": "海心沙", "reason": "江景开阔，适合拍照", "arrival": "11:30", "stay_minutes": 60, "indoor": false },
                { "name": "花城广场", "reason": "城市中轴线漫步", "arrival": "13:30", "stay_minutes": 90, "indoor": false },
                { "name": "北京路步行街", "reason": "美食与骑楼老街", "arrival": "16:00", "stay_minutes": 120, "indoor": false }
              ] } ],
              "tips": ["当天紫外线较强，注意防晒补水"],
              "packing": ["防晒霜", "帽子", "饮用水"],
              "budget": { "transport_cents": 8000, "tickets_cents": 15000,
                          "food_cents": 18000, "other_cents": 5000, "total_cents": 46000 }
            }
            """;

    /** 默认 Open-Meteo daily 响应：2026-11-21，24/17°C，降雨概率 20%，UV 6。 */
    public static final String DEFAULT_WEATHER_BODY = """
            { "daily": {
              "time": ["2026-11-21"],
              "temperature_2m_max": [24.0],
              "temperature_2m_min": [17.0],
              "precipitation_probability_max": [20],
              "precipitation_sum": [0.0],
              "weather_code": [2],
              "wind_speed_10m_max": [12.5],
              "uv_index_max": [6.0]
            } }
            """;

    public static volatile String aiContent = DEFAULT_AI_CONTENT;
    public static volatile int aiStatus = 200;
    public static volatile long aiDelayMs = 0;
    public static volatile String weatherBody = DEFAULT_WEATHER_BODY;
    public static volatile int weatherStatus = 200;

    /** 每次 AI 调用的完整请求体（含提示词）。 */
    public static final List<String> AI_BODIES = Collections.synchronizedList(new ArrayList<>());
    /** 每次天气调用的 query string。 */
    public static final List<String> WEATHER_QUERIES = Collections.synchronizedList(new ArrayList<>());
    public static final AtomicInteger AI_CALLS = new AtomicInteger();

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpServer SERVER;
    public static final int PORT;

    static {
        try {
            SERVER = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            PORT = SERVER.getAddress().getPort();
            SERVER.createContext("/stub-ai/chat/completions", UpstreamStubs::handleAi);
            SERVER.createContext("/stub-weather/v1/forecast", UpstreamStubs::handleWeather);
            SERVER.createContext("/stub-weather/v1/ensemble", UpstreamStubs::handleWeather);
            SERVER.setExecutor(Executors.newCachedThreadPool());
            SERVER.start();
        } catch (IOException error) {
            throw new ExceptionInInitializerError(error);
        }
    }

    private UpstreamStubs() {
    }

    public static String aiBaseUrl() {
        return "http://127.0.0.1:" + PORT + "/stub-ai";
    }

    public static String weatherBaseUrl() {
        return "http://127.0.0.1:" + PORT + "/stub-weather";
    }

    /** 每个用例前恢复默认夹具，避免失败注入串扰。 */
    public static void reset() {
        aiContent = DEFAULT_AI_CONTENT;
        aiStatus = 200;
        aiDelayMs = 0;
        weatherBody = DEFAULT_WEATHER_BODY;
        weatherStatus = 200;
        AI_BODIES.clear();
        WEATHER_QUERIES.clear();
        AI_CALLS.set(0);
    }

    private static void handleAi(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        AI_BODIES.add(body);
        AI_CALLS.incrementAndGet();
        if (aiDelayMs > 0) {
            try {
                Thread.sleep(aiDelayMs);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
        }
        if (aiStatus != 200) {
            respond(exchange, aiStatus, "{\"error\":\"stub upstream failure\"}");
            return;
        }
        String response = MAPPER.writeValueAsString(
                Map.of("choices", List.of(Map.of("message", Map.of("role", "assistant", "content", aiContent)))));
        respond(exchange, 200, response);
    }

    private static void handleWeather(HttpExchange exchange) throws IOException {
        WEATHER_QUERIES.add(String.valueOf(exchange.getRequestURI().getQuery()));
        exchange.getRequestBody().readAllBytes();
        respond(exchange, weatherStatus, weatherBody);
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
        exchange.close();
    }
}