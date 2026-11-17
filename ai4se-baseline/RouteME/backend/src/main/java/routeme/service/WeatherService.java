package routeme.service;

import routeme.param.WeatherQuery;
import routeme.pojo.WeatherForecast;

/**
 * 目的地天气：Open-Meteo 单日预报的获取、归一与出行提醒生成。
 */
public interface WeatherService {

    /**
     * 查询目的地某一天的天气。
     *
     * <p>日期超出预报窗口时返回 {@code available=false}（reason=OUT_OF_RANGE），
     * 不请求上游、不伪造天气；上游失败抛 {@code WeatherUpstreamException}。</p>
     *
     * @param query 目的地（区划码或坐标）与日期
     * @return 归一化天气与出行提醒
     */
    WeatherForecast forecast(WeatherQuery query);
}