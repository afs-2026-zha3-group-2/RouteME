package routeme.controller;

import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import routeme.config.AmapProperties;

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

    private final RestClient amapRestClient;
    private final AmapProperties properties;

    public AmapProxyController(RestClient amapRestClient, AmapProperties properties) {
        this.amapRestClient = amapRestClient;
        this.properties = properties;
    }

    @GetMapping("/**")
    public ResponseEntity<String> proxy(HttpServletRequest request) {
        String path = normalizePath(request.getRequestURI());
        // 高德 JS API 会发埋点请求（v3/log/init）；直接回成功，避免控制台 404 噪音。
        // SDK 以 JSONP 方式加载（callback 包裹），回纯 JSON 会触发 SyntaxError。
        if (path.startsWith("v3/log")) {
            String callback = request.getParameter("callback");
            if (callback != null && callback.matches("[A-Za-z0-9_.]+")) {
                return ResponseEntity.ok()
                        .contentType(MediaType.valueOf("application/javascript"))
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
        try {
            String body = amapRestClient.get()
                    .uri(builder -> {
                        builder.path("/" + path);
                        parameters.forEach((name, values) -> {
                            if (!"key".equalsIgnoreCase(name) && !"jscode".equalsIgnoreCase(name)) {
                                for (String value : values) {
                                    builder.queryParam(name, value);
                                }
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
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body == null ? UPSTREAM_ERROR_BODY : body);
        } catch (RestClientException exception) {
            log.warn("AMap proxy request failed for path {}", path, exception);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(UPSTREAM_ERROR_BODY);
        }
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