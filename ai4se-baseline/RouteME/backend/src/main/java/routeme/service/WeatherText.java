package routeme.service;

import java.util.Map;

/**
 * WMO 天气码 → 中文文案纯函数（码表子集）。
 *
 * <p>Open-Meteo 的 {@code weather_code} 遵循 WMO 4677；未收录的码与 null
 * 一律回退「未知天气」，不猜测语义。
 */
public final class WeatherText {

    private static final Map<Integer, String> TEXTS = Map.ofEntries(
            Map.entry(0, "晴"),
            Map.entry(1, "多云"),
            Map.entry(2, "多云"),
            Map.entry(3, "阴"),
            Map.entry(45, "雾"),
            Map.entry(48, "冻雾"),
            Map.entry(51, "毛毛雨"),
            Map.entry(53, "毛毛雨"),
            Map.entry(55, "毛毛雨"),
            Map.entry(61, "小雨"),
            Map.entry(63, "中雨"),
            Map.entry(65, "大雨"),
            Map.entry(66, "冻雨"),
            Map.entry(67, "冻雨"),
            Map.entry(71, "小雪"),
            Map.entry(73, "中雪"),
            Map.entry(75, "大雪"),
            Map.entry(77, "雪粒"),
            Map.entry(80, "阵雨"),
            Map.entry(81, "阵雨"),
            Map.entry(82, "强阵雨"),
            Map.entry(85, "阵雪"),
            Map.entry(86, "阵雪"),
            Map.entry(95, "雷阵雨"),
            Map.entry(96, "雷阵雨伴冰雹"),
            Map.entry(99, "雷阵雨伴冰雹"));

    private WeatherText() {
    }

    /**
     * 天气码对应的中文文案。
     *
     * @param code WMO 天气码，可为 null
     * @return 中文文案；未收录或 null 返回「未知天气」
     */
    public static String of(Integer code) {
        if (code == null) {
            return "未知天气";
        }
        return TEXTS.getOrDefault(code, "未知天气");
    }
}