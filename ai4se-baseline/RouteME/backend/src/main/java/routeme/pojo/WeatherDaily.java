package routeme.pojo;

/**
 * 单日天气（Open-Meteo daily 归一结果）。
 *
 * <p>温度必须有值；降雨概率、降水量、风速与紫外线指数上游可能缺省，
 * 缺省时为 {@code null}，前端不展示对应项，也不参与提醒推算。</p>
 *
 * @param weatherCode                WMO 4677 天气码
 * @param weatherText                天气码对应的中文文案
 * @param tempMaxC                   当日最高温度（°C）
 * @param tempMinC                   当日最低温度（°C）
 * @param precipitationProbabilityPct 当日最大降雨概率（%），可为 null
 * @param precipitationMm            当日降水量合计（mm），可为 null
 * @param windSpeedKmh               当日最大风速（km/h），可为 null
 * @param uvIndex                    当日最大紫外线指数，可为 null
 */
public record WeatherDaily(
        Integer weatherCode,
        String weatherText,
        double tempMaxC,
        double tempMinC,
        Integer precipitationProbabilityPct,
        Double precipitationMm,
        Double windSpeedKmh,
        Double uvIndex) {
}