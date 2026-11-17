package routeme.param;

import java.time.LocalDate;

/**
 * 天气查询参数：目的地区划码与日期必填其一（坐标可替代区划码），坐标必须成对。
 */
public record WeatherQuery(String destinationCode, LocalDate date, Double lng, Double lat) {
}