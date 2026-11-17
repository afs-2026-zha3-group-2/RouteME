package routeme.utils;

import java.util.Map;

/**
 * WMO 4677 天气码 → 中文文案。
 *
 * <p>Open-Meteo 只返回数字码，未收录的码与 {@code null} 一律回落为「未知天气」，
 * 不使用任何推测文案。</p>
 */
public final class WeatherTextUtils {

    public static final String UNKNOWN = "未知天气";

    private static final Map<Integer, String> TEXTS = Map.ofEntries(
            Map.entry(0, "晴"),
            Map.entry(1, "大部晴朗"),
            Map.entry(2, "多云"),
            Map.entry(3, "阴"),
            Map.entry(45, "有雾"),
            Map.entry(48, "雾凇"),
            Map.entry(51, "小毛毛雨"),
            Map.entry(53, "毛毛雨"),
            Map.entry(55, "浓毛毛雨"),
            Map.entry(56, "冻毛毛雨"),
            Map.entry(57, "强冻毛毛雨"),
            Map.entry(61, "小雨"),
            Map.entry(63, "中雨"),
            Map.entry(65, "大雨"),
            Map.entry(66, "冻雨"),
            Map.entry(67, "强冻雨"),
            Map.entry(71, "小雪"),
            Map.entry(73, "中雪"),
            Map.entry(75, "大雪"),
            Map.entry(77, "米雪"),
            Map.entry(80, "小阵雨"),
            Map.entry(81, "阵雨"),
            Map.entry(82, "强阵雨"),
            Map.entry(85, "小阵雪"),
            Map.entry(86, "强阵雪"),
            Map.entry(95, "雷阵雨"),
            Map.entry(96, "雷阵雨伴小冰雹"),
            Map.entry(99, "雷阵雨伴强冰雹"));

    private WeatherTextUtils() {
    }

    /**
     * 天气码转中文文案。
     *
     * @param weatherCode WMO 天气码，可为 null
     * @return 对应文案；未收录或 null 时返回 {@link #UNKNOWN}
     */
    public static String of(Integer weatherCode) {
        if (weatherCode == null) {
            return UNKNOWN;
        }
        return TEXTS.getOrDefault(weatherCode, UNKNOWN);
    }
}