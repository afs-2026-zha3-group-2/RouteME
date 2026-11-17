package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class WeatherTextUtilsTest {

    @Test
    void mapsKnownWmoCodesToChineseText() {
        assertEquals("晴", WeatherTextUtils.of(0));
        assertEquals("多云", WeatherTextUtils.of(2));
        assertEquals("阴", WeatherTextUtils.of(3));
        assertEquals("有雾", WeatherTextUtils.of(45));
        assertEquals("小雨", WeatherTextUtils.of(61));
        assertEquals("小阵雨", WeatherTextUtils.of(80));
        assertEquals("雷阵雨", WeatherTextUtils.of(95));
        assertEquals("雷阵雨伴强冰雹", WeatherTextUtils.of(99));
    }

    @Test
    void returnsUnknownForUnmappedOrMissingCode() {
        assertEquals(WeatherTextUtils.UNKNOWN, WeatherTextUtils.of(42));
        assertEquals(WeatherTextUtils.UNKNOWN, WeatherTextUtils.of(null));
    }
}