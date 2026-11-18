package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * Open-Meteo 网络失败、非 2xx、响应无法解析或没有请求日的数据。
 *
 * <p>对外统一暴露 {@code WEATHER_UPSTREAM_ERROR}（502），前端据此展示
 * 可重试的失败态；任何情况下都不得用其它日期或当前天气顶替。</p>
 */
public class WeatherUpstreamException extends BusinessException {

    public WeatherUpstreamException(String message) {
        super("WEATHER_UPSTREAM_ERROR", HttpStatus.BAD_GATEWAY, message);
    }

    /**
     * 保留上游网络异常作为根因，供调用方判断是否是连接层失败。
     *
     * @param message 错误细节
     * @param cause   上游网络异常
     */
    public WeatherUpstreamException(String message, Throwable cause) {
        super("WEATHER_UPSTREAM_ERROR", HttpStatus.BAD_GATEWAY, message, cause);
    }
}