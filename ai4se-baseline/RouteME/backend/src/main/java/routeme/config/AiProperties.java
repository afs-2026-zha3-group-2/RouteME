package routeme.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AI（DeepSeek OpenAI 兼容接口）配置。
 *
 * <p>API Key 只保存在后端（环境变量或 gitignore 的 ai-local.yml），不下发到浏览器；
 * 空白视为未配置，generate 返回 503 {@code AI_NOT_CONFIGURED}。
 *
 * @param baseUrl        OpenAI 兼容服务地址，默认 DeepSeek 正式环境，测试替身可覆盖
 * @param apiKey         API Key，缺失时 generate 返回 503 配置错误
 * @param model          模型名，默认 deepseek-chat
 * @param timeoutSeconds 连接与读取超时秒数，默认 60；超时按上游失败处理
 */
@ConfigurationProperties(prefix = "routeme.ai")
public record AiProperties(String baseUrl, String apiKey, String model, Integer timeoutSeconds) {

    private static final String DEFAULT_BASE_URL = "https://api.deepseek.com";
    private static final String DEFAULT_MODEL = "deepseek-chat";
    private static final int DEFAULT_TIMEOUT_SECONDS = 60;

    public AiProperties {
        baseUrl = baseUrl == null || baseUrl.isBlank() ? DEFAULT_BASE_URL : baseUrl;
        model = model == null || model.isBlank() ? DEFAULT_MODEL : model;
        timeoutSeconds = timeoutSeconds == null || timeoutSeconds <= 0
                ? DEFAULT_TIMEOUT_SECONDS
                : timeoutSeconds;
    }

    /** Key 是否已配置（空白视为未配置）。 */
    public boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }
}