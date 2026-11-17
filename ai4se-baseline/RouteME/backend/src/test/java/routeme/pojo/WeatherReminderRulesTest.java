package routeme.pojo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class WeatherReminderRulesTest {

    @Test
    void rainTriggersAtProbabilityOrAmountLowerBound() {
        assertTrue(codes(weather(50, null, 20, 15, null, null, null)).contains("rain"));
        assertFalse(codes(weather(49, 0.9, 20, 15, null, null, null)).contains("rain"));
        assertTrue(codes(weather(null, 1.0, 20, 15, null, null, null)).contains("rain"));
        assertFalse(codes(weather(null, 0.9, 20, 15, null, null, null)).contains("rain"));
    }

    @Test
    void heavyRainAddsOutdoorWarning() {
        String heavy = text(weather(80, null, 20, 15, null, null, null), "rain");
        assertTrue(heavy.contains("户外行程"), heavy);

        String light = text(weather(60, 2.0, 20, 15, null, null, null), "rain");
        assertTrue(light.contains("雨具"), light);
        assertFalse(light.contains("调整户外行程"), light);
    }

    @Test
    void heatTriggersAtThirtyDegrees() {
        assertTrue(codes(weather(null, null, 30, 20, null, null, null)).contains("heat"));
        assertFalse(codes(weather(null, null, 29.9, 20, null, null, null)).contains("heat"));
        assertTrue(text(weather(null, null, 33, 20, null, null, null), "heat").contains("33"));
    }

    @Test
    void uvTriggersAtSixAndIgnoresMissingValue() {
        assertTrue(codes(weather(null, null, 20, 15, 6.0, null, null)).contains("uv"));
        assertFalse(codes(weather(null, null, 20, 15, 5.9, null, null)).contains("uv"));
        assertFalse(codes(weather(null, null, 20, 15, null, null, null)).contains("uv"));
        assertTrue(codes(weather(null, null, 20, 15, null, null, null)).contains("calm"));
    }

    @Test
    void coldTriggersAtTenDegrees() {
        assertTrue(codes(weather(null, null, 15, 10, null, null, null)).contains("cold"));
        assertFalse(codes(weather(null, null, 15, 10.1, null, null, null)).contains("cold"));
    }

    @Test
    void temperatureGapTriggersAtTenDegrees() {
        assertTrue(codes(weather(null, null, 22, 12, null, null, null)).contains("temperature_gap"));
        assertFalse(codes(weather(null, null, 22, 12.1, null, null, null)).contains("temperature_gap"));
    }

    @Test
    void windTriggersAtThirtyKilometresPerHour() {
        assertTrue(codes(weather(null, null, 20, 15, null, null, 30.0)).contains("wind"));
        assertFalse(codes(weather(null, null, 20, 15, null, null, 29.9)).contains("wind"));
    }

    @Test
    void returnsCalmOnlyWhenNothingMatches() {
        List<WeatherReminder> reminders = WeatherReminderRules.of(weather(null, 0.2, 25, 18, 3.0, null, 10.0));
        assertEquals(List.of("calm"), reminders.stream().map(WeatherReminder::code).toList());
    }

    @Test
    void ordersRemindersRainHeatUvColdGapWind() {
        // 8°C / 22°C：命中 rain、heat（22 不命中）、cold、gap（14）、wind、uv
        List<WeatherReminder> reminders =
                WeatherReminderRules.of(weather(90, 12.0, 33, 8, 8.0, "小雨", 40.0));
        assertEquals(
                List.of("rain", "heat", "uv", "cold", "temperature_gap", "wind"),
                reminders.stream().map(WeatherReminder::code).toList());
    }

    /**
     * 构造单日天气，便于逐项控制阈值；温度固定必填，其余可空。
     */
    private static WeatherDaily weather(
            Integer rainProbabilityPct,
            Double rainMm,
            double tempMax,
            double tempMin,
            Double uvIndex,
            String weatherText,
            Double windSpeedKmh) {
        return new WeatherDaily(
                61,
                weatherText == null ? "小雨" : weatherText,
                tempMax,
                tempMin,
                rainProbabilityPct,
                rainMm,
                windSpeedKmh,
                uvIndex);
    }

    private static List<String> codes(WeatherDaily weather) {
        return WeatherReminderRules.of(weather).stream().map(WeatherReminder::code).toList();
    }

    private static String text(WeatherDaily weather, String code) {
        return WeatherReminderRules.of(weather).stream()
                .filter(reminder -> reminder.code().equals(code))
                .map(WeatherReminder::text)
                .findFirst()
                .orElse("");
    }
}