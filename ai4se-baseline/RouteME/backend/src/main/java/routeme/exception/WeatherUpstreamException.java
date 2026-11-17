package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * Open-Meteo 网络失败、非 2xx 或无请求日数据：暴露 WEATHER_UPSTREAM_ERROR，
 * 不产出伪造天气，由前端 Retry 驱动重试。
 */
public class WeatherUpstreamException extends BusinessException {

    public WeatherUpstreamException(String message) {
        super("WEATHER_UPSTREAM_ERROR", HttpStatus.BAD_GATEWAY, message);
    }
}