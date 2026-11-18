package routeme.controller;

import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import routeme.config.AmapProperties;
import routeme.utils.TtlCache;

/**
 * 高德 Web 服务同源代理。
 *
 * <p>前端（高德 JS API 2.0 的 {@code serviceHost} 指向 {@code /_AMapService}）只请求
 * 本站路径，由本控制器补上 Key 与安全密钥后转发到高德 REST API。这样安全密钥不会
 * 出现在浏览器产物里，也避免把高德 Key 硬编码在业务组件中。
 *
 * <p>只允许 GET 与白名单内的搜索/逆地理/路线规划接口，基础地址固定为配置值，
 * 不接受客户端传入的完整 URL，避免被当作任意请求转发器。
 *
 * <p>平台标记：JS API 的 Key（Web 端）必须是 {@code s=rsv3} 才会被 restapi 接受，
 * 否则一律返回 10009 USERKEY_PLAT_NOMATCH——即使 Key 与安全密钥都正确。
 * 浏览器发往 {@code /_AMapService} 的请求不带这个参数，因此由本代理补齐。
 *
 * <p>只读检索与路线成功结果按「路径 + 语义参数」短时缓存，降低高德配额消耗。
 * JS API 用 JSONP 请求且 callback 名每次随机：代理不把 callback 转发给上游，而是
 * 缓存纯 JSON，命中后按本次 callback 重新包裹，避免回调串号。请求带
 * {@code refresh=true} 可跳过缓存读取；{@code DELETE /api/amap/cache} 清空缓存。
 * 上游返回 {@code status=0}（如 10021 配额超限）不缓存，避免把错误状态固化下来。</p>
 */
@Slf4j
@RestController
@RequestMapping({"/api/amap", "/_AMapService"})
public class AmapProxyController {

    /** 与前端搜索、定位、路线规划实际使用的接口保持一致（含 JS 插件走的 v4 路径）。 */
    private static final Set<String> ALLOWED_PATHS = Set.of(
            "v3/place/text",
            "v3/place/around",
            "v3/place/detail",
            "v3/assistant/inputtips",
            "v3/geocode/geo",
            "v3/geocode/regeo",
            "v3/ip",
            "v3/direction/walking",
            "v3/direction/driving",
            "v3/direction/bicycling",
            "v3/direction/transit/integrated",
            "v4/direction/walking",
            "v4/direction/driving",
            "v4/direction/bicycling");

    private static final String MISSING_KEY_BODY =
            "{\"status\":\"0\",\"info\":\"AMAP_KEY_NOT_CONFIGURED\",\"infocode\":\"50000\"}";
    /**
     * JS API Key 的平台标记：restapi 靠它区分「Web 端」与「Web 服务」Key。
     * 缺失时 JS API Key 会被判为平台不匹配（10009）。
     */
    static final String JS_PLATFORM = "rsv3";
    private static final String UPSTREAM_ERROR_BODY =
            "{\"status\":\"0\",\"info\":\"AMAP_PROXY_UNAVAILABLE\",\"infocode\":\"50001\"}";
    private static final String OK_BODY =
            "{\"status\":\"1\",\"info\":\"OK\",\"infocode\":\"10000\"}";

    /**
     * 可缓存的只读路径：检索、地理编码与路线规划。
     *
     * <p>不含 {@code v3/ip}：它是 JS API 的 Key 自检探针，缓存命中会掩盖配置错误；
     * 也不含 {@code v3/log/*}：埋点请求本身在本地直接应答。</p>
     */
    private static final Set<String> CACHEABLE_PATHS = Set.of(
            "v3/place/text",
            "v3/place/around",
            "v3/place/detail",
            "v3/assistant/inputtips",
            "v3/geocode/geo",
            "v3/geocode/regeo",
            "v3/direction/walking",
            "v3/direction/driving",
            "v3/direction/bicycling",
            "v3/direction/transit/integrated",
            "v4/direction/walking",
            "v4/direction/driving",
            "v4/direction/bicycling");

    /** 不参与缓存键的参数：凭据、JSONP 回调名与刷新开关都不影响上游结果。 */
    private static final Set<String> NON_CACHE_KEY_PARAMS =
            Set.of("key", "jscode", "callback", "refresh");

    /** 上游失败响应（例如 10021 配额超限）不写入缓存，避免把错误状态固化。 */
    private static final Pattern UPSTREAM_SUCCESS = Pattern.compile("\"status\"\\s*:\\s*\"1\"");

    private static final Pattern SAFE_CALLBACK = Pattern.compile("[A-Za-z0-9_.]+");

    private static final MediaType JAVASCRIPT = MediaType.valueOf("application/javascript");

    private final RestClient amapRestClient;
    private final AmapProperties properties;
    private final TtlCache<String, String> responseCache;

    public AmapProxyController(RestClient amapRestClient, AmapProperties properties, Clock clock) {
        this.amapRestClient = amapRestClient;
        this.properties = properties;
        this.responseCache = new TtlCache<>(
                Duration.ofSeconds(properties.cacheTtlSeconds()),
                properties.cacheMaxEntries(),
                clock);
    }

    @GetMapping("/**")
    public ResponseEntity<String> proxy(HttpServletRequest request) {
        String path = normalizePath(request.getRequestURI());
        // 高德 JS API 会发埋点请求（v3/log/init）；直接回成功，避免控制台 404 噪音。
        // SDK 以 JSONP 方式加载（callback 包裹），回纯 JSON 会触发 SyntaxError。
        if (path.startsWith("v3/log")) {
            String callback = request.getParameter("callback");
            if (isSafeCallback(callback)) {
                return ResponseEntity.ok()
                        .contentType(JAVASCRIPT)
                        .body(callback + "(" + OK_BODY + ")");
            }
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(OK_BODY);
        }
        if (!isAllowed(path)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"status\":\"0\",\"info\":\"AMAP_PATH_NOT_ALLOWED\",\"infocode\":\"50002\"}");
        }
        if (!properties.hasWebServiceKey()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(MISSING_KEY_BODY);
        }

        Map<String, String[]> parameters = request.getParameterMap();
        String incomingKey = request.getParameter("key");
        String incomingJscode = request.getParameter("jscode");
        String callback = request.getParameter("callback");
        boolean cacheable = CACHEABLE_PATHS.contains(path);
        boolean refresh = "true".equalsIgnoreCase(request.getParameter("refresh"));
        String cacheKey = cacheable ? cacheKey(path, parameters) : null;
        if (cacheKey != null && !refresh) {
            String cached = responseCache.get(cacheKey);
            if (cached != null) {
                log.debug("AMap proxy cache hit for path {}", path);
                return jsonResponse(cached, callback);
            }
        }
        try {
            String body = amapRestClient.get()
                    .uri(builder -> {
                        builder.path("/" + path);
                        parameters.forEach((name, values) -> {
                            // callback 不转发：上游回纯 JSON，JSONP 包裹在本代理完成，
                            // 缓存才不会被某个一次性的回调名污染。
                            if ("key".equalsIgnoreCase(name)
                                    || "jscode".equalsIgnoreCase(name)
                                    || "callback".equalsIgnoreCase(name)
                                    || "refresh".equalsIgnoreCase(name)) {
                                return;
                            }
                            for (String value : values) {
                                builder.queryParam(name, value);
                            }
                        });
                        if (parameters.keySet().stream().noneMatch(name -> "s".equalsIgnoreCase(name))) {
                            builder.queryParam("s", JS_PLATFORM);
                        }
                        if (properties.hasWebServiceKey()) {
                            builder.queryParam("key", properties.webServiceKey());
                        } else if (incomingKey != null && !incomingKey.isBlank()) {
                            builder.queryParam("key", incomingKey);
                        }
                        if (properties.hasSecurityJsCode()) {
                            builder.queryParam("jscode", properties.securityJsCode());
                        } else if (incomingJscode != null && !incomingJscode.isBlank()) {
                            builder.queryParam("jscode", incomingJscode);
                        }
                        return builder.build();
                    })
                    .retrieve()
                    .body(String.class);
            if (body == null) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(UPSTREAM_ERROR_BODY);
            }
            if (cacheKey != null && UPSTREAM_SUCCESS.matcher(body).find()) {
                responseCache.put(cacheKey, body);
            }
            return jsonResponse(body, callback);
        } catch (RestClientException exception) {
            log.warn("AMap proxy request failed for path {}", path, exception);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(UPSTREAM_ERROR_BODY);
        }
    }

    /**
     * 清空高德只读响应缓存。
     *
     * @return 被清理的缓存条目数
     */
    @DeleteMapping("/cache")
    public Map<String, Integer> clearCache() {
        int cleared = responseCache.clear();
        log.info("AMap proxy cache cleared: {} entries", cleared);
        return Map.of("cleared", cleared);
    }

    /** 纯 JSON 直接回；带安全 callback 时按本次回调名包裹成 JSONP，与 JS API 期望一致。 */
    private static ResponseEntity<String> jsonResponse(String body, String callback) {
        if (isSafeCallback(callback)) {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(callback + "(" + body + ")");
        }
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private static boolean isSafeCallback(String callback) {
        return callback != null && SAFE_CALLBACK.matcher(callback).matches();
    }

    /**
     * 缓存键：路径 + 排序后的语义参数。
     *
     * <p>参数排序保证同一组条件不同顺序命中同一键；凭据、回调名与刷新开关不参与，
     * 否则每次 JSONP 调用都会生成新键，缓存永远不命中。</p>
     */
    private static String cacheKey(String path, Map<String, String[]> parameters) {
        Map<String, String> normalized = new TreeMap<>();
        parameters.forEach((name, values) -> {
            if (values == null || values.length == 0
                    || NON_CACHE_KEY_PARAMS.contains(name.toLowerCase(Locale.ROOT))) {
                return;
            }
            normalized.put(name, String.join(",", Arrays.stream(values).sorted().toList()));
        });
        StringBuilder key = new StringBuilder(path);
        normalized.forEach((name, value) -> key.append('&').append(name).append('=').append(value));
        return key.toString();
    }

    /** {@code /api/amap/v3/place/text} 或 {@code /_AMapService/v3/place/text} → {@code v3/place/text}。 */
    static String normalizePath(String requestUri) {
        String path = requestUri.replaceFirst("^/(api/amap|_AMapService)", "");
        int queryIndex = path.indexOf('?');
        if (queryIndex >= 0) {
            path = path.substring(0, queryIndex);
        }
        while (path.startsWith("/")) {
            path = path.substring(1);
        }
        while (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }

    static boolean isAllowed(String path) {
        return ALLOWED_PATHS.contains(path);
    }
}