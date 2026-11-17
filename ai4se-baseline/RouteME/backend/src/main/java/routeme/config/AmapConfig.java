package routeme.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/** 高德 Web 服务代理使用的 HTTP 客户端。 */
@Configuration
@EnableConfigurationProperties(AmapProperties.class)
public class AmapConfig {

    @Bean
    public RestClient amapRestClient(AmapProperties properties) {
        return RestClient.builder().baseUrl(properties.baseUrl()).build();
    }
}