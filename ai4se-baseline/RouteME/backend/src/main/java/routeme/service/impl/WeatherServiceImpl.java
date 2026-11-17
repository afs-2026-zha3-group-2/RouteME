package routeme.service.impl;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import routeme.constant.TripTimeZoneConstant;
import routeme.exception.InvalidInputException;
import routeme.exception.WeatherUpstreamException;
import routeme.pojo.WeatherForecast;
import routeme.service.WeatherService;
import routeme.service.WeatherText;

/**
 * Open-Meteo 天气代理实现：窗口校验先于上游调用，daily 数组按请求日对齐后归一。
 * 方法契约以 {@link WeatherService} 为准。
 */
@Slf4j
@Service
public class WeatherServiceImpl implements WeatherService {

    /** Open-Meteo 约 16 天预报，业务窗口收敛为今天起 15 天。 */
    private static final int FORECAST_WINDOW_DAYS = 15;

    private static final String DAILY_FIELDS = String.join(",",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
            "weather_code",
            "wind_speed_10m_max",
            "uv_index_max");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestClient weatherRestClient;
    private final Clock clock;

    public WeatherServiceImpl(RestClient weatherRestClient, Clock clock) {
        this.weatherRestClient = weatherRestClient;
        this.clock = clock;
    }

    @Override
    public WeatherForecast forecast(double lng, double lat, String date) {
        LocalDate day = parseDate(date);
        requireCoordinates(lng, lat);
        requireWithinWindow(day);

        String body;
        try {
            body = weatherRestClient.get()
                    .uri(builder -> builder.path("/v1/forecast")
                            .queryParam("latitude", lat)
                            .queryParam("longitude", lng)
                            .queryParam("daily", DAILY_FIELDS)
                            .queryParam("timezone", "auto")
                            .queryParam("start_date", day.toString())
                            .queryParam("end_date", day.toString())
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException exception) {
            log.warn("Open-Meteo forecast request failed for {} at {},{}", day, lng, lat, exception);
            throw new WeatherUpstreamException("weather upstream request failed");
        }
        return normalize(body, day);
    }

    private LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException exception) {
            throw new InvalidInputException("date must be in yyyy-MM-dd");
        }
    }

    private void requireCoordinates(double lng, double lat) {
        if (!Double.isFinite(lng) || lng < -180 || lng > 180
                || !Double.isFinite(lat) || lat < -90 || lat > 90) {
            throw new InvalidInputException("lng/lat out of range");
        }
    }

    private void requireWithinWindow(LocalDate day) {
        LocalDate today = LocalDate.ofInstant(clock.instant(), TripTimeZoneConstant.ZONE);
        if (day.isBefore(today) || day.isAfter(today.plusDays(FORECAST_WINDOW_DAYS))) {
            throw new InvalidInputException(
                    "date must be between " + today + " and " + today.plusDays(FORECAST_WINDOW_DAYS));
        }
    }

    private WeatherForecast normalize(String body, LocalDate day) {
        OpenMeteoResponse response;
        try {
            response = MAPPER.readValue(body, OpenMeteoResponse.class);
        } catch (JacksonException exception) {
            log.warn("Open-Meteo response is not valid JSON for {}", day, exception);
            throw new WeatherUpstreamException("weather upstream returned invalid payload");
        }
        Daily daily = response == null ? null : response.daily();
        int index = indexOfDate(daily, day.toString());
        if (index < 0) {
            throw new WeatherUpstreamException("no forecast data for " + day);
        }
        Double tempMax = at(daily.temperature_2m_max(), index);
        Double tempMin = at(daily.temperature_2m_min(), index);
        Integer probability = at(daily.precipitation_probability_max(), index);
        Integer code = at(daily.weather_code(), index);
        if (tempMax == null || tempMin == null || probability == null || code == null) {
            throw new WeatherUpstreamException("forecast data incomplete for " + day);
        }
        return new WeatherForecast(
                day.toString(),
                tempMax,
                tempMin,
                probability,
                at(daily.precipitation_sum(), index),
                code,
                WeatherText.of(code),
                at(daily.wind_speed_10m_max(), index),
                at(daily.uv_index_max(), index),
                "open-meteo");
    }

    private static int indexOfDate(Daily daily, String date) {
        if (daily == null || daily.time() == null) {
            return -1;
        }
        return daily.time().indexOf(date);
    }

    private static <T> T at(List<T> values, int index) {
        if (values == null || index >= values.size()) {
            return null;
        }
        return values.get(index);
    }

    /** Open-Meteo 响应只取 daily；其余顶层字段（坐标/单位等）忽略。 */
    private record OpenMeteoResponse(Daily daily) {
    }

    /** daily 各要素为按 time 对齐的数组；组件名与上游 JSON 键一致。 */
    private record Daily(
            List<String> time,
            List<Double> temperature_2m_max,
            List<Double> temperature_2m_min,
            List<Integer> precipitation_probability_max,
            List<Double> precipitation_sum,
            List<Integer> weather_code,
            List<Double> wind_speed_10m_max,
            List<Double> uv_index_max) {
    }
}