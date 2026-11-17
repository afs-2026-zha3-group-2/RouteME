package routeme.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/** Open-Meteo 天气代理使用的 HTTP 客户端。 */
@Configuration
@EnableConfigurationProperties(WeatherProperties.class)
public class WeatherConfig {

    @Bean
    public RestClient weatherRestClient(WeatherProperties properties) {
        return RestClient.builder().baseUrl(properties.baseUrl()).build();
    }
}