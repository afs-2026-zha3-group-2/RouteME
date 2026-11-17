package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 高德地图 Web 服务配置。
 *
 * <p>Web 服务 Key 只保存在后端，通过 {@code /api/amap/**} 代理使用；前端只持有
 * 可公开的 JS API Key。两个 Key 在环境变量中分开配置：
 * {@code AMAP_WEB_SERVICE_KEY} 与 {@code VITE_AMAP_JS_KEY}（前端）。
 *
 * @param webServiceKey 高德 Web 服务 Key，缺失时代理返回 503 配置错误
 * @param baseUrl       高德 Web 服务地址，默认正式环境，测试或私有网关可覆盖
 */
@ConfigurationProperties(prefix = "routeme.amap")
public record AmapProperties(String webServiceKey, String baseUrl) {

    private static final String DEFAULT_BASE_URL = "https://restapi.amap.com";

    public AmapProperties {
        baseUrl = baseUrl == null || baseUrl.isBlank() ? DEFAULT_BASE_URL : baseUrl;
    }

    /** Key 是否已配置（空白视为未配置）。 */
    public boolean hasWebServiceKey() {
        return webServiceKey != null && !webServiceKey.isBlank();
    }
}