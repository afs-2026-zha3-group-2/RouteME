package routeme.pojo;

/**
 * 归一化后的目的地单日天气摘要（契约 WeatherForecast，snake_case 由全局 Jackson 策略输出）。
 *
 * <p>全部数值来自 Open-Meteo 实测/预报，不做任何估算；{@code uvIndex} 上游不可用时为 null，
 * 前端不展示 UV 行。{@code source} 恒为 {@code open-meteo}，供前端标注数据来源。
 *
 * @param date                       请求日 yyyy-MM-dd
 * @param tempMaxC                   最高温度 °C
 * @param tempMinC                   最低温度 °C
 * @param precipitationProbabilityPct 降雨概率 %
 * @param precipitationMm            降水量 mm，上游缺失时 null
 * @param weatherCode                WMO 天气码
 * @param weatherText                天气码中文文案
 * @param windSpeedKmh               最大风速 km/h，上游缺失时 null
 * @param uvIndex                    紫外线指数，上游缺失时 null
 * @param source                     数据来源标识
 */
public record WeatherForecast(
        String date,
        Double tempMaxC,
        Double tempMinC,
        Integer precipitationProbabilityPct,
        Double precipitationMm,
        Integer weatherCode,
        String weatherText,
        Double windSpeedKmh,
        Double uvIndex,
        String source) {
}