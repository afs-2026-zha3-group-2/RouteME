package routeme.response;

/**
 * 天气缓存清理结果。
 *
 * @param cleared 被清理的缓存条目数
 */
public record WeatherCacheClearResponse(int cleared) {
}