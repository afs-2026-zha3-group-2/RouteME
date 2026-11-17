package routeme.service.impl;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

import routeme.area.AreaNames;
import routeme.exception.InvalidInputException;
import routeme.exception.WeatherUpstreamException;
import routeme.pojo.WeatherLocation;

/**
 * 目的地坐标解析：把 6 位区划码解析成城市中心坐标。
 *
 * <p>用户已经在发布页选过城市，天气不得再要求输入城市名，因此坐标由区划码推导。
 * 支持 375 个城市，不能手工维护坐标表，这里用 Open-Meteo 的免 Key 地理编码接口，
 * 并按区划码在进程内缓存成功结果（城市坐标是静态事实，无需过期）。
 * 失败不缓存，允许用户重试。</p>
 */
@Slf4j
@Component
public class DestinationLocator {

    /** 行政区划常见后缀：整串查不到时去掉后重试一次。 */
    private static final Pattern AREA_SUFFIX = Pattern.compile("(特别行政区|自治区|自治州|地区|新区|盟|市|县|区)$");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestClient weatherGeocodingRestClient;
    private final Map<String, WeatherLocation> cache = new ConcurrentHashMap<>();

    public DestinationLocator(RestClient weatherGeocodingRestClient) {
        this.weatherGeocodingRestClient = weatherGeocodingRestClient;
    }

    /**
     * 解析目的地城市中心坐标。
     *
     * @param destinationCode 6 位区划码
     * @return 城市坐标与显示名
     * @throws InvalidInputException    区划码不在支持范围
     * @throws WeatherUpstreamException 地理编码不可用或没有匹配结果
     */
    public WeatherLocation locate(String destinationCode) {
        if (!AreaNames.isValidCityCode(destinationCode)) {
            throw new InvalidInputException("destination_code is not a supported city");
        }
        WeatherLocation cached = cache.get(destinationCode);
        if (cached != null) {
            return cached;
        }
        String displayName = AreaNames.cityDisplayNameOf(destinationCode);
        Optional<WeatherLocation> found = search(displayName);
        if (found.isEmpty()) {
            String stripped = AREA_SUFFIX.matcher(displayName).replaceFirst("").trim();
            if (!stripped.isEmpty() && !stripped.equals(displayName)) {
                found = search(stripped);
            }
        }
        WeatherLocation location = found.orElseThrow(() -> new WeatherUpstreamException(
                "cannot resolve coordinates for " + displayName));
        cache.put(destinationCode, location);
        return location;
    }

    private Optional<WeatherLocation> search(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        String body;
        try {
            body = weatherGeocodingRestClient.get()
                    .uri(builder -> builder.path("/v1/search")
                            .queryParam("name", name)
                            .queryParam("count", 1)
                            .queryParam("language", "zh")
                            .queryParam("countryCode", "CN")
                            .queryParam("format", "json")
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException exception) {
            log.warn("Open-Meteo geocoding request failed for {}", name, exception);
            throw new WeatherUpstreamException("weather geocoding unavailable");
        }
        if (body == null || body.isBlank()) {
            throw new WeatherUpstreamException("weather geocoding returned an empty body");
        }
        GeocodingResponse response;
        try {
            response = MAPPER.readValue(body, GeocodingResponse.class);
        } catch (RuntimeException exception) {
            log.warn("Open-Meteo geocoding response is not valid JSON for {}", name, exception);
            throw new WeatherUpstreamException("weather geocoding returned invalid json");
        }
        if (response == null || response.results() == null || response.results().isEmpty()) {
            return Optional.empty();
        }
        GeocodingResult result = response.results().getFirst();
        String resolvedName = result.name() == null || result.name().isBlank() ? name : result.name();
        return Optional.of(new WeatherLocation(result.longitude(), result.latitude(), resolvedName));
    }

    /** 地理编码响应只取 results；其它顶层字段忽略。 */
    private record GeocodingResponse(java.util.List<GeocodingResult> results) {
    }

    private record GeocodingResult(String name, double latitude, double longitude) {
    }
}