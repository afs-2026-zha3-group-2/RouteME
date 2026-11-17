package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Open-Meteo 天气服务配置：无需 Key，只有基础地址。
 *
 * @param baseUrl Open-Meteo 地址，默认正式环境，测试替身或私有网关可覆盖
 */
@ConfigurationProperties(prefix = "routeme.weather")
public record WeatherProperties(String baseUrl) {

    private static final String DEFAULT_BASE_URL = "https://api.open-meteo.com";

    public WeatherProperties {
        baseUrl = baseUrl == null || baseUrl.isBlank() ? DEFAULT_BASE_URL : baseUrl;
    }
}