package routeme.service.impl;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import lombok.extern.slf4j.Slf4j;
import routeme.config.AiProperties;
import routeme.entity.AiItineraryEntity;
import routeme.exception.AiInvalidOutputException;
import routeme.exception.AiNotConfiguredException;
import routeme.exception.AiUpstreamException;
import routeme.exception.InvalidInputException;
import routeme.mapper.AiItineraryMapper;
import routeme.param.WeatherQuery;
import routeme.pojo.AiGenerateResponse;
import routeme.pojo.AiItinerarySaved;
import routeme.pojo.AiItinerarySnapshot;
import routeme.pojo.AiPlace;
import routeme.pojo.AiPlan;
import routeme.pojo.WeatherDaily;
import routeme.pojo.WeatherForecast;
import routeme.request.AiGenerateRequest;
import routeme.service.AiItineraryService;
import routeme.service.WeatherService;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.json.JsonMapper;

/**
 * AI 行程实现：天气权威来自 Open-Meteo（generate 内自取注入），
 * AI 只产出名称/顺序/理由/时间/估算；地图数据一律不由 AI 生成。
 * 快照整存整取，归属当前用户。方法契约以 {@link AiItineraryService} 为准。
 */
@Slf4j
@Service
public class AiItineraryServiceImpl extends AbstractServiceImpl<AiItineraryMapper, AiItineraryEntity>
        implements AiItineraryService {

    private static final Set<String> DURATIONS = Set.of("half_day", "one_day", "two_day");
    private static final Set<String> TRAVEL_MODES = Set.of("transit", "walking", "driving");
    private static final Set<String> PACES = Set.of("relaxed", "moderate", "compact");

    /** 单次输出 token 上限（DeepSeek chat 最大 8192）；6000 为长行程留足余量。 */
    private static final int MAX_OUTPUT_TOKENS = 6000;

    /** 时长档位 → 景点数量口径（E2E 只断言 ≥2）。 */
    private static final Map<String, String> DURATION_GUIDE = Map.of(
            "half_day", "半天，推荐 2–3 个景点",
            "one_day", "1 天，推荐 3–5 个景点",
            "two_day", "2 天，每天推荐 3–4 个景点");

    private static final Map<String, String> MODE_LABELS = Map.of(
            "transit", "公共交通 + 步行", "walking", "步行", "driving", "自驾");
    private static final Map<String, String> PACE_LABELS = Map.of(
            "relaxed", "宽松", "moderate", "适中", "compact", "紧凑");

    /** 提示词里的「当前时间」格式：模型据此判断当天行程不能排到过去。 */
    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private static final String SYSTEM_PROMPT = """
            你是旅行行程规划助手。只输出一个 JSON 对象，不要输出任何其他文字或解释。
            推荐的 POI 必须真实存在、能在高德地图中搜索到；不得输出经纬度、路线、距离、交通时间等地图数据，
            不得输出天气数值，不得声称真实价格；所有费用均为 AI 估算，单位为分。
            JSON 形状：
            {"title":"…","days":[{"day":1,"stops":[{"name":"…","reason":"…","arrival":"HH:mm","stay_minutes":60,"indoor":false}]}],
            "tips":["…"],"packing":["…"],
            "budget":{"transport_cents":0,"tickets_cents":0,"food_cents":0,"other_cents":0,"total_cents":0}}
            """;

    // 与 Spring 主 ObjectMapper 一致采用 SNAKE_CASE：快照内嵌 add-trip-weather 的
    // WeatherForecast/WeatherDaily 为 camelCase 组件，需该策略才能绑定 snake_case JSON。
    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .build();

    private final AiProperties properties;
    private final RestClient aiRestClient;
    private final WeatherService weatherService;
    private final Clock clock;

    public AiItineraryServiceImpl(
            AiProperties properties, RestClient aiRestClient, WeatherService weatherService, Clock clock) {
        this.properties = properties;
        this.aiRestClient = aiRestClient;
        this.weatherService = weatherService;
        this.clock = clock;
    }

    @Override
    public AiGenerateResponse generate(AiGenerateRequest request) {
        String duration = normalizeEnum(request.duration(), DURATIONS, "one_day", "duration");
        String travelMode = normalizeEnum(request.travelMode(), TRAVEL_MODES, "transit", "travel_mode");
        String pace = normalizeEnum(request.pace(), PACES, "moderate", "pace");
        requirePlace(request.origin(), "origin");
        requirePlace(request.destination(), "destination");
        if (request.date() == null || request.date().isBlank()) {
            throw new InvalidInputException("date is required");
        }
        if (request.budgetCents() != null && request.budgetCents() < 0) {
            throw new InvalidInputException("budget_cents must not be negative");
        }
        if (!properties.hasApiKey()) {
            throw new AiNotConfiguredException("routeme.ai.api-key is not configured");
        }

        // 天气先于 AI：失败即终止，不消耗 AI 配额，也不产出伪造天气。
        // 天气权威由 add-trip-weather 的 WeatherService 提供（坐标 + 日期）；
        // 超出预报窗口返回 available=false，AI 生成据此终止（INVALID_INPUT）。
        LocalDate date = parseDate(request.date());
        WeatherForecast weather = weatherService.forecast(
                new WeatherQuery(null, date, request.destination().lng(), request.destination().lat()));
        if (!weather.available()) {
            throw new InvalidInputException("date is outside the forecast window");
        }

        String prompt = buildUserPrompt(request, weather, duration, travelMode, pace);
        AiPlan plan = generatePlanWithRetry(prompt);
        return new AiGenerateResponse(plan, weather);
    }

    /**
     * 调用模型并把输出解析成计划；输出不合法（截断 / 非 JSON / 字段缺失）时自动重试一次。
     * 日志记录 finish_reason、字符数与片段，便于区分「到 token 上限」与「上游读断」。
     */
    private AiPlan generatePlanWithRetry(String prompt) {
        AiCall first = callAi(prompt);
        try {
            return parseAndValidate(first.content());
        } catch (AiInvalidOutputException invalid) {
            log.warn("AI output rejected on first attempt (finish_reason={}, chars={}): {}; retrying once. snippet={}",
                    first.finishReason(), first.content().length(), invalid.getMessage(), snippet(first.content()));
        }
        AiCall retry = callAi(prompt);
        try {
            return parseAndValidate(retry.content());
        } catch (AiInvalidOutputException invalid) {
            log.warn("AI output rejected after retry (finish_reason={}, chars={}): {}; snippet={}",
                    retry.finishReason(), retry.content().length(), invalid.getMessage(), snippet(retry.content()));
            throw invalid;
        }
    }

    /** 日志用输出片段：压平空白后截断，避免日志被整段 JSON 撑满。 */
    private static String snippet(String content) {
        String flat = content == null ? "" : content.replaceAll("\\s+", " ").trim();
        return flat.length() <= 500 ? flat : flat.substring(0, 500) + "…";
    }

    private String normalizeEnum(String value, Set<String> allowed, String defaultValue, String field) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        if (!allowed.contains(value)) {
            throw new InvalidInputException(field + " must be one of " + allowed);
        }
        return value;
    }

    private static LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException exception) {
            throw new InvalidInputException("date must be in yyyy-MM-dd");
        }
    }

    private void requirePlace(AiPlace place, String field) {
        if (place == null || place.name() == null || place.name().isBlank()) {
            throw new InvalidInputException(field + ".name is required");
        }
        Double lng = place.lng();
        Double lat = place.lat();
        if (lng == null || lat == null
                || !Double.isFinite(lng) || lng < -180 || lng > 180
                || !Double.isFinite(lat) || lat < -90 || lat > 90) {
            throw new InvalidInputException(field + " must carry valid lng/lat from map search");
        }
    }

    private String buildUserPrompt(
            AiGenerateRequest request, WeatherForecast weather,
            String duration, String travelMode, String pace) {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        boolean startsToday = today.toString().equals(request.date());
        StringBuilder prompt = new StringBuilder();
        prompt.append("请为用户规划一条游玩路线。\n")
                .append("出发地：").append(request.origin().name()).append('\n')
                .append("目的地：").append(request.destination().name()).append('\n')
                .append("旅行日期：").append(request.date()).append('\n')
                // 模型不知道「现在几点」：不告诉它，当天行程会排出一堆已经过去的到达时间。
                .append("当前时间：").append(now.format(TIME_FORMAT)).append('\n')
                .append(startsToday
                        ? "注意：行程从今天开始，第一站的到达时间必须晚于当前时间，不得把景点排在已经过去的时段。\n"
                        : "注意：行程不是今天开始，按正常作息（不早于 09:00）安排即可。\n")
                .append("游玩时长：").append(DURATION_GUIDE.get(duration)).append('\n')
                .append("出行方式：").append(MODE_LABELS.get(travelMode)).append('\n')
                .append("行程节奏：").append(PACE_LABELS.get(pace)).append('\n')
                .append("兴趣偏好：").append(interestsText(request.interests())).append('\n');
        if (request.budgetCents() != null) {
            String yuan = yuan(request.budgetCents());
            prompt.append("预算：").append(yuan).append(" 元，估算合计应尽量不超过预算。\n");
            if (Boolean.TRUE.equals(request.reduceBudget())) {
                prompt.append("本次为「AI 帮我降低预算」：估算合计不得超过预算 ")
                        .append(yuan).append(" 元，优先免费或低价景点，压缩餐饮与门票估算。\n");
            }
        } else {
            prompt.append("预算：未提供，给出合理估算即可。\n");
        }
        WeatherDaily daily = weather.weather();
        prompt.append("目的地当天真实天气（Open-Meteo，必须纳入推荐）：")
                .append("最高温度 ").append(daily.tempMaxC()).append("°C，")
                .append("最低温度 ").append(daily.tempMinC()).append("°C，")
                .append("降雨概率 ").append(daily.precipitationProbabilityPct()).append("%，");
        if (daily.precipitationMm() != null) {
            prompt.append("降水量 ").append(daily.precipitationMm()).append("mm，");
        }
        prompt.append("天气状态 ").append(daily.weatherText()).append("，");
        if (daily.windSpeedKmh() != null) {
            prompt.append("风速 ").append(daily.windSpeedKmh()).append("km/h，");
        }
        if (daily.uvIndex() != null) {
            prompt.append("UV 指数 ").append(daily.uvIndex()).append("，");
        }
        prompt.append('\n')
                .append("天气行为规则：降雨概率高或降水明显时优先室内景点（indoor=true），建议雨伞/防水鞋，减少长时间户外；")
                .append("高温或 UV 较高时减少中午长时间户外，建议防晒霜/帽子/饮用水；")
                .append("低温时提醒早晚温差，建议外套。tips 与 packing 必须与上述真实天气对应。\n")
                .append("每个景点给出推荐理由、建议到达时间（HH:mm）与建议停留分钟数；按游玩顺序排列。");
        return prompt.toString();
    }

    private static String interestsText(List<String> interests) {
        if (interests == null || interests.isEmpty()) {
            return "未提供";
        }
        return String.join("、", interests);
    }

    private static String yuan(long cents) {
        return BigDecimal.valueOf(cents).movePointLeft(2).stripTrailingZeros().toPlainString();
    }

    private AiCall callAi(String userPrompt) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.model());
        body.put("stream", false);
        // 显式抬高输出上限：默认 4096 在长行程/长理由时容易截断成不完整 JSON。
        body.put("max_tokens", MAX_OUTPUT_TOKENS);
        body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userPrompt)));
        String response;
        try {
            response = aiRestClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + properties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(MAPPER.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException exception) {
            log.warn("AI upstream request failed", exception);
            throw new AiUpstreamException("AI upstream request failed");
        }
        ChatCompletion completion;
        try {
            completion = MAPPER.readValue(response, ChatCompletion.class);
        } catch (JacksonException exception) {
            log.warn("AI upstream response is not valid JSON", exception);
            throw new AiInvalidOutputException("AI upstream returned invalid payload");
        }
        if (completion == null || completion.choices() == null || completion.choices().isEmpty()
                || completion.choices().get(0).message() == null) {
            throw new AiInvalidOutputException("AI upstream returned no message");
        }
        String content = completion.choices().get(0).message().content();
        if (content == null || content.isBlank()) {
            throw new AiInvalidOutputException("AI upstream returned empty content");
        }
        return new AiCall(content, completion.choices().get(0).finishReason());
    }

    private AiPlan parseAndValidate(String rawContent) {
        AiPlan plan;
        try {
            plan = MAPPER.readValue(stripFence(rawContent), AiPlan.class);
        } catch (JacksonException exception) {
            log.warn("AI output is not valid JSON", exception);
            throw new AiInvalidOutputException("AI output is not valid JSON");
        }
        validate(plan);
        AiPlan.Budget budget = plan.budget().withRecomputedTotal();
        return new AiPlan(plan.title(), plan.days(), plan.tips(), plan.packing(), budget);
    }

    /** 容忍 markdown 围栏：```json … ``` 剥掉首尾围栏行。 */
    private static String stripFence(String content) {
        String trimmed = content.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }
        int firstNewline = trimmed.indexOf('\n');
        String inner = firstNewline >= 0 ? trimmed.substring(firstNewline + 1) : "";
        if (inner.endsWith("```")) {
            inner = inner.substring(0, inner.length() - 3);
        }
        return inner.trim();
    }

    private void validate(AiPlan plan) {
        if (plan == null || plan.title() == null || plan.title().isBlank()) {
            throw new AiInvalidOutputException("AI output missing title");
        }
        if (plan.days() == null || plan.days().isEmpty()) {
            throw new AiInvalidOutputException("AI output missing days");
        }
        int stopCount = 0;
        for (AiPlan.Day day : plan.days()) {
            if (day == null || day.day() == null || day.stops() == null) {
                throw new AiInvalidOutputException("AI output has malformed day");
            }
            for (AiPlan.Stop stop : day.stops()) {
                validateStop(stop);
                stopCount++;
            }
        }
        if (stopCount < 2) {
            throw new AiInvalidOutputException("AI output must contain at least 2 stops");
        }
        if (plan.tips() == null || plan.packing() == null) {
            throw new AiInvalidOutputException("AI output missing tips/packing");
        }
        AiPlan.Budget budget = plan.budget();
        if (budget == null || budget.transport_cents() == null || budget.tickets_cents() == null
                || budget.food_cents() == null || budget.other_cents() == null) {
            throw new AiInvalidOutputException("AI output missing budget fields");
        }
        if (budget.transport_cents() < 0 || budget.tickets_cents() < 0
                || budget.food_cents() < 0 || budget.other_cents() < 0) {
            throw new AiInvalidOutputException("AI output budget must not be negative");
        }
    }

    private void validateStop(AiPlan.Stop stop) {
        if (stop == null || stop.name() == null || stop.name().isBlank()
                || stop.reason() == null || stop.reason().isBlank()) {
            throw new AiInvalidOutputException("AI output stop missing name/reason");
        }
        if (stop.arrival() == null || !stop.arrival().matches("\\d{2}:\\d{2}")) {
            throw new AiInvalidOutputException("AI output stop arrival must be HH:mm");
        }
        if (stop.stay_minutes() == null || stop.stay_minutes() < 1 || stop.indoor() == null) {
            throw new AiInvalidOutputException("AI output stop missing stay_minutes/indoor");
        }
    }

    /** OpenAI 兼容响应：只取 choices[0].message.content 与结束原因。 */
    private record ChatCompletion(List<Choice> choices) {
    }

    private record Choice(Message message, String finishReason) {
    }

    private record Message(String role, String content) {
    }

    /** 一次模型调用的结果。 */
    private record AiCall(String content, String finishReason) {
    }

    /* ---------- 快照整存整取（B7 / B8） ---------- */

    @Override
    @Transactional
    public AiItinerarySaved saveSnapshot(String snapshotJson, long userId) {
        AiItinerarySnapshot snapshot = parseSnapshot(snapshotJson);
        validateSnapshot(snapshot);
        AiItineraryEntity entity = new AiItineraryEntity();
        entity.setId(nextId(AiItineraryEntity::getId));
        entity.setUserId(userId);
        entity.setSnapshot(snapshotJson);
        entity.setCreatedAt(clock.instant().toString());
        save(entity);
        return new AiItinerarySaved(entity.getId());
    }

    @Override
    public String requireOwnedSnapshot(long id, long userId) {
        AiItineraryEntity entity = getById(id);
        if (entity == null || entity.getUserId() != userId) {
            throw new InvalidInputException("AI 行程不存在或不属于当前用户");
        }
        return entity.getSnapshot();
    }

    private AiItinerarySnapshot parseSnapshot(String snapshotJson) {
        try {
            AiItinerarySnapshot snapshot = MAPPER.readValue(snapshotJson, AiItinerarySnapshot.class);
            if (snapshot == null) {
                throw new InvalidInputException("AI 行程快照不能为空");
            }
            return snapshot;
        } catch (JacksonException exception) {
            throw new InvalidInputException("AI 行程快照不是合法 JSON");
        }
    }

    private void validateSnapshot(AiItinerarySnapshot snapshot) {
        requirePlace(snapshot.origin(), "origin");
        requirePlace(snapshot.destination(), "destination");
        if (snapshot.date() == null || snapshot.date().isBlank()) {
            throw new InvalidInputException("date is required");
        }
        try {
            LocalDate.parse(snapshot.date());
        } catch (DateTimeParseException exception) {
            throw new InvalidInputException("date must be in yyyy-MM-dd");
        }
        normalizeEnum(snapshot.travel_mode(), TRAVEL_MODES, "transit", "travel_mode");
        if (snapshot.stops() == null || snapshot.stops().isEmpty()) {
            throw new InvalidInputException("AI 行程至少需要 2 个已定位景点");
        }
        int resolvedCount = 0;
        for (AiItinerarySnapshot.Stop stop : snapshot.stops()) {
            validateSnapshotStop(stop);
            if (Boolean.TRUE.equals(stop.resolved())) {
                resolvedCount++;
            }
        }
        if (resolvedCount < 2) {
            throw new InvalidInputException("AI 行程至少需要 2 个已定位景点");
        }
    }

    private void validateSnapshotStop(AiItinerarySnapshot.Stop stop) {
        if (stop == null || stop.name() == null || stop.name().isBlank()
                || stop.order() == null || stop.reason() == null || stop.reason().isBlank()
                || stop.arrival() == null || !stop.arrival().matches("\\d{2}:\\d{2}")
                || stop.stay_minutes() == null || stop.stay_minutes() < 1
                || stop.indoor() == null || stop.resolved() == null) {
            throw new InvalidInputException("AI 行程景点字段不完整");
        }
        if (Boolean.TRUE.equals(stop.resolved())) {
            Double lng = stop.lng();
            Double lat = stop.lat();
            if (lng == null || lat == null
                    || !Double.isFinite(lng) || lng < -180 || lng > 180
                    || !Double.isFinite(lat) || lat < -90 || lat > 90) {
                throw new InvalidInputException("已定位景点必须携带高德解析的经纬度");
            }
        }
    }
}