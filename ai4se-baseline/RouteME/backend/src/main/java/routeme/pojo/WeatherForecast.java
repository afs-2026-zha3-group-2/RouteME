package routeme.pojo;

import java.time.LocalDate;
import java.util.List;

/**
 * 目的地单日天气响应。
 *
 * <p>{@code available=false} 表示该日期不在可查询预报窗口内，
 * 此时 {@code weather} 为 null、{@code reminders} 为空、{@code lng}/{@code lat} 为 null；
 * 前端据此展示「暂无该日期天气预报」，不得改用其它日期或当前天气。</p>
 *
 * @param date            查询日期
 * @param destinationCode 目的地 6 位区划码，未提供时为 null
 * @param city            目的地显示名，未解析时为 null
 * @param lng             实际使用的经度，不可用时为 null
 * @param lat             实际使用的纬度，不可用时为 null
 * @param available       该日期是否有可用的真实天气
 * @param reason          不可用原因，可用时为 null（当前仅 OUT_OF_RANGE）
 * @param weather         单日天气，不可用时为 null
 * @param reminders       出行提醒，按固定顺序返回
 * @param source          数据来源，恒为 open-meteo
 */
public record WeatherForecast(
        LocalDate date,
        String destinationCode,
        String city,
        Double lng,
        Double lat,
        boolean available,
        String reason,
        WeatherDaily weather,
        List<WeatherReminder> reminders,
        String source) {

    public static final String SOURCE = "open-meteo";
    public static final String REASON_OUT_OF_RANGE = "OUT_OF_RANGE";

    /** 日期不在预报窗口内时的响应：不携带任何天气数值与提醒。 */
    public static WeatherForecast unavailable(
            LocalDate date, String destinationCode, String city, String reason) {
        return new WeatherForecast(
                date, destinationCode, city, null, null, false, reason, null, List.of(), SOURCE);
    }

    /** 真实天气可用时的响应。 */
    public static WeatherForecast available(
            LocalDate date,
            String destinationCode,
            WeatherLocation location,
            WeatherDaily weather) {
        return new WeatherForecast(
                date,
                destinationCode,
                location.name(),
                location.lng(),
                location.lat(),
                true,
                null,
                weather,
                WeatherReminderRules.of(weather),
                SOURCE);
    }
}