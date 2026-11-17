package routeme.service;

import routeme.pojo.WeatherForecast;

/**
 * 目的地天气：Open-Meteo 单日预报的获取与归一。
 */
public interface WeatherService {

    /**
     * 查询目的地指定日期的天气摘要。
     *
     * <p>日期必须落在预报窗口内（今天 ≤ date ≤ 今天+15，按行程业务时区解释），
     * 超窗抛 {@code INVALID_INPUT}；上游失败或无该日数据抛
     * {@code WEATHER_UPSTREAM_ERROR}，绝不返回估算或伪造天气。
     *
     * @param lng  目的地经度
     * @param lat  目的地纬度
     * @param date 旅行日期 yyyy-MM-dd
     * @return 归一化天气摘要，source 恒为 open-meteo
     */
    WeatherForecast forecast(double lng, double lat, String date);
}