package routeme.pojo;

/**
 * 天气查询使用的目的地坐标。
 *
 * @param lng  经度
 * @param lat  纬度
 * @param name 城市显示名，无法确定时为空串
 */
public record WeatherLocation(double lng, double lat, String name) {
}