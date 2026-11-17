package routeme.config;

import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * 高德 Web 服务代理使用的 HTTP 客户端。
 *
 * <p>必须设置超时：默认 RestClient 没有连接/读取超时，上游卡住时浏览器会一直
 * 等待，最后只能看到「高德服务返回错误」这种无法定位的提示。
 */
@Configuration
@EnableConfigurationProperties(AmapProperties.class)
public class AmapConfig {

    /** 连接超时：4 秒足够建立到 restapi.amap.com 的 TCP 连接。 */
    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(4);
    /** 读取超时：路线规划最慢，留 8 秒余量。 */
    static final Duration READ_TIMEOUT = Duration.ofSeconds(8);

    @Bean
    public RestClient amapRestClient(AmapProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(factory)
                .build();
    }
}