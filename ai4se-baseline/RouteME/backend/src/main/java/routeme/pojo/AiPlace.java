package routeme.pojo;

/**
 * AI 行程里的地点（出发地/目的地）：名称 + 高德解析出的经纬度。
 *
 * @param name 地点名称
 * @param lng  经度（高德结果，非 AI 生成）
 * @param lat  纬度（高德结果，非 AI 生成）
 */
public record AiPlace(String name, Double lng, Double lat) {
}