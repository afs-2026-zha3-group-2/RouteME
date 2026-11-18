package routeme.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 第三方保险入口只读取配置，不创建额外客户端。
 */
@Configuration
@EnableConfigurationProperties(InsuranceProperties.class)
public class InsuranceConfig {
}