package routeme.service;

import routeme.param.WeatherQuery;
import routeme.pojo.WeatherForecast;

/**
 * 目的地天气：Open-Meteo 单日预报的获取、归一与出行提醒生成。
 */
public interface WeatherService {

    /**
     * 查询目的地某一天的天气（命中进程内缓存时直接返回）。
     *
     * <p>日期超出预报窗口时返回 {@code available=false}（reason=OUT_OF_RANGE），
     * 不请求上游、不伪造天气；上游失败抛 {@code WeatherUpstreamException}。</p>
     *
     * @param query 目的地（区划码或坐标）与日期
     * @return 归一化天气与出行提醒
     */
    WeatherForecast forecast(WeatherQuery query);

    /**
     * 查询目的地某一天的天气，可选择绕过缓存。
     *
     * @param query   目的地（区划码或坐标）与日期
     * @param refresh {@code true} 时不读缓存，直接请求上游并用新结果覆盖缓存
     * @return 归一化天气与出行提醒
     */
    WeatherForecast forecast(WeatherQuery query, boolean refresh);

    /**
     * 清空预报缓存，让后续请求重新访问上游。
     *
     * @return 被清理的缓存条目数
     */
    int clearCache();
}