package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Open-Meteo 天气服务配置：免 Key，只有两个基础地址。
 *
 * <p>正式环境默认官方地址；测试替身或私有网关可通过环境变量覆盖，
 * 使 CI 与离线环境不依赖外网。</p>
 *
 * @param baseUrl          天气预报地址（{@code /v1/forecast} 的根）
 * @param geocodingBaseUrl 城市地理编码地址（{@code /v1/search} 的根）
 */
@ConfigurationProperties(prefix = "routeme.weather")
public record WeatherProperties(String baseUrl, String geocodingBaseUrl) {

    private static final String DEFAULT_BASE_URL = "https://api.open-meteo.com";
    private static final String DEFAULT_GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com";

    public WeatherProperties {
        baseUrl = normalize(baseUrl, DEFAULT_BASE_URL);
        geocodingBaseUrl = normalize(geocodingBaseUrl, DEFAULT_GEOCODING_BASE_URL);
    }

    private static String normalize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}