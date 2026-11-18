package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Open-Meteo 天气服务配置：免 Key，三个基础地址与进程内预报缓存参数。
 *
 * <p>正式环境默认官方地址；测试替身或私有网关可通过环境变量覆盖，
 * 使 CI 与离线环境不依赖外网。</p>
 *
 * <p>{@code fallbackBaseUrl} 是同一数据源（Open-Meteo）的集合预报主机。
 * 主用接口 {@code api.open-meteo.com} 在部分网络（例如国内部分出口）会被阻断，
 * 但集合预报主机可达，因此主用接口连接失败时自动切换到它，数值仍然来自 Open-Meteo。</p>
 *
 * <p>预报按「日期 + 经纬度（约 1 km）+ 上游来源」缓存，默认 30 分钟。TTL 越小越及时、
 * 上游调用越多；{@code cacheTtlMinutes=0} 可关闭缓存。缓存只保存成功结果。</p>
 *
 * @param baseUrl          天气预报地址（{@code /v1/forecast} 的根）
 * @param geocodingBaseUrl 城市地理编码地址（{@code /v1/search} 的根）
 * @param fallbackBaseUrl  备用预报地址（{@code /v1/ensemble} 的根）
 * @param cacheTtlMinutes  预报缓存存活分钟数；空或 0/负数关闭缓存
 * @param cacheMaxEntries  预报缓存最大条目数，超出后淘汰最早到期的条目
 */
@ConfigurationProperties(prefix = "routeme.weather")
public record WeatherProperties(
        String baseUrl,
        String geocodingBaseUrl,
        String fallbackBaseUrl,
        Long cacheTtlMinutes,
        Integer cacheMaxEntries) {

    private static final String DEFAULT_BASE_URL = "https://api.open-meteo.com";
    private static final String DEFAULT_GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com";
    private static final String DEFAULT_FALLBACK_BASE_URL = "https://ensemble-api.open-meteo.com";
    private static final long DEFAULT_CACHE_TTL_MINUTES = 30L;
    private static final int DEFAULT_CACHE_MAX_ENTRIES = 2000;

    public WeatherProperties {
        baseUrl = normalize(baseUrl, DEFAULT_BASE_URL);
        geocodingBaseUrl = normalize(geocodingBaseUrl, DEFAULT_GEOCODING_BASE_URL);
        fallbackBaseUrl = normalize(fallbackBaseUrl, DEFAULT_FALLBACK_BASE_URL);
        cacheTtlMinutes = cacheTtlMinutes == null ? DEFAULT_CACHE_TTL_MINUTES : cacheTtlMinutes;
        cacheMaxEntries = cacheMaxEntries == null ? DEFAULT_CACHE_MAX_ENTRIES : cacheMaxEntries;
    }

    private static String normalize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}