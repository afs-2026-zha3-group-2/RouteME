package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 成长经验配置：首次发布体验的默认经验值；非法值回退 10。
 */
@ConfigurationProperties(prefix = "routeme.growth")
public record GrowthProperties(int publishExp) {

    public static final int DEFAULT_PUBLISH_EXP = 10;

    public GrowthProperties {
        if (publishExp <= 0) {
            publishExp = DEFAULT_PUBLISH_EXP;
        }
    }
}
