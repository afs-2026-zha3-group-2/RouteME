package routeme.pojo;

/**
 * AI 生成响应（契约 AiGenerateResponse）：方案 + 本次生成实际使用的真实天气。
 *
 * <p>weather 为权威天气（L-02）：前端生成成功后右栏天气卡切换到该值，
 * 预览接口 {@code /api/weather/forecast} 仅供生成前展示与单独 Retry。
 *
 * @param plan    AI 推荐方案
 * @param weather Open-Meteo 天气摘要（后端自取注入，非 AI 生成）
 */
public record AiGenerateResponse(AiPlan plan, WeatherForecast weather) {
}