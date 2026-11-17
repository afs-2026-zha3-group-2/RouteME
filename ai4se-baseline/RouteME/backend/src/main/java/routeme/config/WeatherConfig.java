package routeme.config;

import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Open-Meteo 天气与地理编码使用的 HTTP 客户端。
 *
 * <p>必须设置超时：默认 {@link RestClient} 没有连接 / 读取超时，
 * 上游卡住时页面会一直停在加载态，用户无法判断是天气不可用还是网络问题。</p>
 */
@Configuration
@EnableConfigurationProperties(WeatherProperties.class)
public class WeatherConfig {

    /** 连接超时：4 秒足够建立到 Open-Meteo 的 TCP 连接。 */
    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(4);
    /** 读取超时：天气响应体很小，8 秒是保守上限。 */
    static final Duration READ_TIMEOUT = Duration.ofSeconds(8);

    @Bean
    public RestClient weatherRestClient(WeatherProperties properties) {
        return build(properties.baseUrl());
    }

    @Bean
    public RestClient weatherGeocodingRestClient(WeatherProperties properties) {
        return build(properties.geocodingBaseUrl());
    }

    private static RestClient build(String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }
}