package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 高德地图配置。
 *
 * <p>本仓库的代理走「JS API 安全密钥」模式：{@code webServiceKey} 填前端同一个
 * 「Web 端（JS API）」Key，{@code securityJsCode} 填它的安全密钥；代理转发时补
 * {@code s=rsv3} 与 {@code jscode}，这样 Key 与安全密钥都不必下发给浏览器之外的地方。
 *
 * <p>如果另外申请了「Web 服务」类型的 Key，同样可以直接填到 {@code webServiceKey}，
 * 此时 {@code securityJsCode} 可选。
 *
 * @param webServiceKey 高德 Key（JS API Key 或 Web 服务 Key），缺失时代理返回 503 配置错误
 * @param securityJsCode 高德 JS API 安全密钥（securityJsCode），只保存在后端
 * @param baseUrl       高德 Web 服务地址，默认正式环境，测试或私有网关可覆盖
 */
@ConfigurationProperties(prefix = "routeme.amap")
public record AmapProperties(String webServiceKey, String securityJsCode, String baseUrl) {

    private static final String DEFAULT_BASE_URL = "https://restapi.amap.com";

    public AmapProperties {
        baseUrl = baseUrl == null || baseUrl.isBlank() ? DEFAULT_BASE_URL : baseUrl;
    }

    /** Key 是否已配置（空白视为未配置）。 */
    public boolean hasWebServiceKey() {
        return webServiceKey != null && !webServiceKey.isBlank();
    }

    /** 安全密钥是否已配置。 */
    public boolean hasSecurityJsCode() {
        return securityJsCode != null && !securityJsCode.isBlank();
    }
}