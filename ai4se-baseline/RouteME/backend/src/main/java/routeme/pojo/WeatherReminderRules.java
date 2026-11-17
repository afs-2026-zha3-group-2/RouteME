package routeme.pojo;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 出行提醒规则：全部阈值与文案的唯一来源。
 *
 * <p>规则只读 {@link WeatherDaily} 的真实字段，不做任何估算；同一时刻可能命中多条，
 * 返回顺序固定为降雨 → 高温 → 紫外线 → 低温 → 温差 → 强风 → 平稳，
 * 保证两处页面与后续消费方看到同样的顺序。</p>
 */
public final class WeatherReminderRules {

    /** 降雨概率达到该值即提醒带伞。 */
    public static final int RAIN_PROBABILITY_PCT = 50;
    /** 降雨概率达到该值即加强户外提示。 */
    public static final int RAIN_PROBABILITY_HEAVY_PCT = 80;
    /** 降水量达到该值（mm）即提醒带伞。 */
    public static final double RAIN_MM = 1.0;
    /** 降水量达到该值（mm）即加强户外提示。 */
    public static final double RAIN_HEAVY_MM = 10.0;
    /** 最高温达到该值即提醒防晒补水。 */
    public static final double HEAT_C = 30.0;
    /** 紫外线指数达到该值即提醒防晒措施。 */
    public static final double UV = 6.0;
    /** 最低温低于等于该值即提醒外套。 */
    public static final double COLD_C = 10.0;
    /** 昼夜温差达到该值即提醒早晚加衣。 */
    public static final double TEMPERATURE_GAP_C = 10.0;
    /** 风速达到该值（km/h）即提醒防风。 */
    public static final double WIND_KMH = 30.0;

    private WeatherReminderRules() {
    }

    /**
     * 按固定顺序生成提醒；天气不可用时调用方不应调用本方法。
     *
     * @param weather 单日天气
     * @return 至少一条提醒（全未命中时返回平稳提示）
     */
    public static List<WeatherReminder> of(WeatherDaily weather) {
        List<WeatherReminder> reminders = new ArrayList<>();
        addRain(reminders, weather);
        addHeat(reminders, weather);
        addUv(reminders, weather);
        addCold(reminders, weather);
        addTemperatureGap(reminders, weather);
        addWind(reminders, weather);
        if (reminders.isEmpty()) {
            reminders.add(new WeatherReminder("calm", "天气平稳，按计划出行即可。"));
        }
        return List.copyOf(reminders);
    }

    private static void addRain(List<WeatherReminder> reminders, WeatherDaily weather) {
        Integer probability = weather.precipitationProbabilityPct();
        double millimetres = weather.precipitationMm() == null ? 0.0 : weather.precipitationMm();
        boolean likelyByProbability = probability != null && probability >= RAIN_PROBABILITY_PCT;
        boolean likelyByAmount = millimetres >= RAIN_MM;
        if (!likelyByProbability && !likelyByAmount) {
            return;
        }
        boolean heavy = (probability != null && probability >= RAIN_PROBABILITY_HEAVY_PCT)
                || millimetres >= RAIN_HEAVY_MM;
        String text = likelyByProbability
                ? "降雨概率 " + probability + "%，记得带伞和雨具，户外行程注意防雨。"
                : "预计降雨 " + decimal(millimetres) + " mm，记得带伞和雨具，户外行程注意防雨。";
        if (heavy) {
            text = text + "降雨明显，建议调整户外行程。";
        }
        reminders.add(new WeatherReminder("rain", text));
    }

    private static void addHeat(List<WeatherReminder> reminders, WeatherDaily weather) {
        if (weather.tempMaxC() < HEAT_C) {
            return;
        }
        reminders.add(new WeatherReminder(
                "heat", "最高 " + whole(weather.tempMaxC()) + "°C，注意防晒并及时补水。"));
    }

    private static void addUv(List<WeatherReminder> reminders, WeatherDaily weather) {
        Double uvIndex = weather.uvIndex();
        if (uvIndex == null || uvIndex < UV) {
            return;
        }
        reminders.add(new WeatherReminder(
                "uv",
                "紫外线指数 " + decimal(uvIndex) + "，较强，建议涂防晒霜、戴帽子和太阳镜。"));
    }

    private static void addCold(List<WeatherReminder> reminders, WeatherDaily weather) {
        if (weather.tempMinC() > COLD_C) {
            return;
        }
        reminders.add(new WeatherReminder(
                "cold", "最低 " + whole(weather.tempMinC()) + "°C，记得带件外套。"));
    }

    private static void addTemperatureGap(List<WeatherReminder> reminders, WeatherDaily weather) {
        double gap = weather.tempMaxC() - weather.tempMinC();
        if (gap < TEMPERATURE_GAP_C) {
            return;
        }
        reminders.add(new WeatherReminder(
                "temperature_gap",
                "白天 " + whole(weather.tempMaxC()) + "°C、夜间 " + whole(weather.tempMinC())
                        + "°C，昼夜温差 " + whole(gap) + "°C，早晚注意加外套。"));
    }

    private static void addWind(List<WeatherReminder> reminders, WeatherDaily weather) {
        Double windSpeed = weather.windSpeedKmh();
        if (windSpeed == null || windSpeed < WIND_KMH) {
            return;
        }
        reminders.add(new WeatherReminder(
                "wind",
                "风速最大 " + whole(windSpeed) + " km/h，注意防风，户外活动注意安全。"));
    }

    private static String whole(double value) {
        return Long.toString(Math.round(value));
    }

    private static String decimal(double value) {
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }
}