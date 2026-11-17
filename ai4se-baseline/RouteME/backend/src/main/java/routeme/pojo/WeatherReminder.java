package routeme.pojo;

/**
 * 单条出行提醒：{@code code} 用于前端选图标 / 色调，{@code text} 是直接展示的完整文案。
 *
 * @param code 提醒类别（rain / heat / uv / cold / temperature_gap / wind / calm）
 * @param text 面向用户的完整文案，内含真实天气数值
 */
public record WeatherReminder(String code, String text) {
}