package routeme.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 成长经验配置绑定。
 */
@Configuration
@EnableConfigurationProperties(GrowthProperties.class)
public class GrowthConfig {
}
