package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 第三方保险服务配置：RouteMe 只保存提供方名称与入口地址，不参与定价与承保。
 *
 * <p>默认值仅为演示占位；接入真实保险机构时通过环境变量覆盖，
 * 页面展示的提供方名称与条款 / 理赔 / 求助链接随之切换。</p>
 */
@ConfigurationProperties(prefix = "routeme.insurance")
public record InsuranceProperties(
        String providerName,
        String purchaseUrl,
        String policyUrl,
        String claimUrl,
        String emergencyUrl) {

    private static final String DEFAULT_PROVIDER_NAME = "第三方保险机构";
    private static final String DEFAULT_PURCHASE_URL = "https://example.com/routeme/insurance/purchase";
    private static final String DEFAULT_POLICY_URL = "https://example.com/routeme/insurance/policy";
    private static final String DEFAULT_CLAIM_URL = "https://example.com/routeme/insurance/claims";
    private static final String DEFAULT_EMERGENCY_URL = "https://example.com/routeme/insurance/emergency";

    public InsuranceProperties {
        providerName = normalize(providerName, DEFAULT_PROVIDER_NAME);
        purchaseUrl = normalize(purchaseUrl, DEFAULT_PURCHASE_URL);
        policyUrl = normalize(policyUrl, DEFAULT_POLICY_URL);
        claimUrl = normalize(claimUrl, DEFAULT_CLAIM_URL);
        emergencyUrl = normalize(emergencyUrl, DEFAULT_EMERGENCY_URL);
    }

    private static String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}