package routeme.service.impl;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

import routeme.area.AreaNames;
import routeme.constant.TripTimeZoneConstant;
import routeme.exception.InvalidInputException;
import routeme.exception.WeatherUpstreamException;
import routeme.param.WeatherQuery;
import routeme.pojo.WeatherDaily;
import routeme.pojo.WeatherForecast;
import routeme.pojo.WeatherLocation;
import routeme.service.WeatherService;
import routeme.utils.WeatherTextUtils;

/**
 * 天气查询实现：窗口校验 → 坐标确定 → Open-Meteo 调用 → daily 对齐 → 归一与提醒。
 *
 * <p>所有数值原样来自 Open-Meteo；只用 {@code start_date}/{@code end_date} 取请求日，
 * 找不到该日数据视为上游失败，绝不回落到其它日期。</p>
 */
@Slf4j
@Service
public class WeatherServiceImpl implements WeatherService {

    /** Open-Meteo 预报窗口约 16 天，业务窗口收敛为今天起 15 天。 */
    static final int FORECAST_WINDOW_DAYS = 15;

    private static final String DAILY_VARIABLES = String.join(",",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
            "weather_code",
            "wind_speed_10m_max",
            "uv_index_max");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestClient weatherRestClient;
    private final DestinationLocator destinationLocator;
    private final Clock clock;

    public WeatherServiceImpl(
            RestClient weatherRestClient, DestinationLocator destinationLocator, Clock clock) {
        this.weatherRestClient = weatherRestClient;
        this.destinationLocator = destinationLocator;
        this.clock = clock;
    }

    @Override
    public WeatherForecast forecast(WeatherQuery query) {
        LocalDate date = query.date();
        String destinationCode = query.destinationCode() == null ? "" : query.destinationCode().trim();
        boolean hasPoint = query.lng() != null && query.lat() != null;
        boolean missingPoint = (query.lng() == null) != (query.lat() == null);
        if (missingPoint) {
            throw new InvalidInputException("lng and lat must be provided together");
        }
        if (hasPoint) {
            requireValidPoint(query.lng(), query.lat());
        } else if (!AreaNames.isValidCityCode(destinationCode)) {
            throw new InvalidInputException("destination_code is not a supported city");
        }

        LocalDate today = LocalDate.ofInstant(clock.instant(), TripTimeZoneConstant.ZONE);
        if (date.isBefore(today) || date.isAfter(today.plusDays(FORECAST_WINDOW_DAYS))) {
            return WeatherForecast.unavailable(
                    date,
                    destinationCode.isEmpty() ? null : destinationCode,
                    destinationCode.isEmpty() ? null : AreaNames.cityDisplayNameOf(destinationCode),
                    WeatherForecast.REASON_OUT_OF_RANGE);
        }

        WeatherLocation location = hasPoint
                ? new WeatherLocation(
                        query.lng(),
                        query.lat(),
                        destinationCode.isEmpty() ? "" : AreaNames.cityDisplayNameOf(destinationCode))
                : destinationLocator.locate(destinationCode);
        WeatherDaily weather = fetchDaily(location, date);
        return WeatherForecast.available(
                date, destinationCode.isEmpty() ? null : destinationCode, location, weather);
    }

    private static void requireValidPoint(double lng, double lat) {
        if (lng < -180 || lng > 180) {
            throw new InvalidInputException("lng must be between -180 and 180");
        }
        if (lat < -90 || lat > 90) {
            throw new InvalidInputException("lat must be between -90 and 90");
        }
    }

    private WeatherDaily fetchDaily(WeatherLocation location, LocalDate date) {
        String body;
        try {
            body = weatherRestClient.get()
                    .uri(builder -> builder.path("/v1/forecast")
                            .queryParam("latitude", location.lat())
                            .queryParam("longitude", location.lng())
                            .queryParam("daily", DAILY_VARIABLES)
                            .queryParam("timezone", TripTimeZoneConstant.ZONE.getId())
                            .queryParam("start_date", date.toString())
                            .queryParam("end_date", date.toString())
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException exception) {
            log.warn("Open-Meteo forecast request failed for {} at {},{}", date, location.lng(), location.lat(), exception);
            throw new WeatherUpstreamException("weather forecast unavailable");
        }
        if (body == null || body.isBlank()) {
            throw new WeatherUpstreamException("weather forecast returned an empty body");
        }
        OpenMeteoResponse response;
        try {
            response = MAPPER.readValue(body, OpenMeteoResponse.class);
        } catch (RuntimeException exception) {
            log.warn("Open-Meteo forecast response is not valid JSON for {}", date, exception);
            throw new WeatherUpstreamException("weather forecast returned invalid json");
        }
        Daily daily = response == null ? null : response.daily();
        int index = indexOfDate(daily == null ? null : daily.time(), date);
        if (index < 0) {
            throw new WeatherUpstreamException("weather forecast has no data for " + date);
        }
        Double tempMax = valueAt(daily.temperatureMax(), index);
        Double tempMin = valueAt(daily.temperatureMin(), index);
        if (tempMax == null || tempMin == null) {
            throw new WeatherUpstreamException("weather forecast has no temperature for " + date);
        }
        Double weatherCode = valueAt(daily.weatherCode(), index);
        Integer code = weatherCode == null ? null : (int) Math.round(weatherCode);
        Double probability = valueAt(daily.precipitationProbabilityMax(), index);
        return new WeatherDaily(
                code,
                WeatherTextUtils.of(code),
                tempMax,
                tempMin,
                probability == null ? null : (int) Math.round(probability),
                valueAt(daily.precipitationSum(), index),
                valueAt(daily.windSpeedMax(), index),
                valueAt(daily.uvIndexMax(), index));
    }

    private static int indexOfDate(List<String> times, LocalDate date) {
        if (times == null) {
            return -1;
        }
        return times.indexOf(date.toString());
    }

    private static Double valueAt(List<Double> values, int index) {
        if (values == null || index < 0 || index >= values.size()) {
            return null;
        }
        return values.get(index);
    }

    /** Open-Meteo 响应只取 daily；其余顶层字段（坐标 / 单位等）忽略。 */
    private record OpenMeteoResponse(Daily daily) {
    }

    private record Daily(
            List<String> time,
            @JsonProperty("temperature_2m_max") List<Double> temperatureMax,
            @JsonProperty("temperature_2m_min") List<Double> temperatureMin,
            @JsonProperty("precipitation_probability_max") List<Double> precipitationProbabilityMax,
            @JsonProperty("precipitation_sum") List<Double> precipitationSum,
            @JsonProperty("weather_code") List<Double> weatherCode,
            @JsonProperty("wind_speed_10m_max") List<Double> windSpeedMax,
            @JsonProperty("uv_index_max") List<Double> uvIndexMax) {
    }
}