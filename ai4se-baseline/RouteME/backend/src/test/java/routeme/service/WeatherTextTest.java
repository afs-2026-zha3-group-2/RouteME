package routeme.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

/** B12：WMO 天气码 → 中文文案纯函数。 */
class WeatherTextTest {

    @Test
    void in_wmoCodes_out_chineseText() {
        assertEquals("晴", WeatherText.of(0));
        assertEquals("多云", WeatherText.of(2));
        assertEquals("阴", WeatherText.of(3));
        assertEquals("小雨", WeatherText.of(61));
        assertEquals("大雨", WeatherText.of(65));
        assertEquals("大雪", WeatherText.of(75));
        assertEquals("雷阵雨", WeatherText.of(95));
    }

    @Test
    void in_unknownOrNullCode_out_fallbackText() {
        assertEquals("未知天气", WeatherText.of(999));
        assertEquals("未知天气", WeatherText.of(null));
    }
}