package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Clock;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import jakarta.servlet.http.HttpServletRequest;
import routeme.config.AmapProperties;

class AmapProxyControllerTest {

    /** 缓存 TTL 取默认 10 分钟；单测不依赖真实时间流逝。 */
    private static AmapProperties properties() {
        return new AmapProperties("js-key", "security-code", null, null, null);
    }

    @Test
    void normalizesProxyPaths() {
        assertEquals("v3/place/text", AmapProxyController.normalizePath("/api/amap/v3/place/text"));
        assertEquals(
                "v3/direction/driving",
                AmapProxyController.normalizePath("/api/amap/v3/direction/driving?origin=1,2"));
        assertEquals("v3/geocode/geo", AmapProxyController.normalizePath("/api/amap/v3/geocode/geo/"));
        assertEquals(
                "v3/direction/walking",
                AmapProxyController.normalizePath("/_AMapService/v3/direction/walking"));
    }

    @Test
    void onlyAllowsKnownWebServicePaths() {
        assertTrue(AmapProxyController.isAllowed("v3/place/text"));
        assertTrue(AmapProxyController.isAllowed("v3/direction/bicycling"));
        // JS API Riding 插件走 v4 路径。
        assertTrue(AmapProxyController.isAllowed("v4/direction/bicycling"));
        assertFalse(AmapProxyController.isAllowed("v3/unknown"));
        assertFalse(AmapProxyController.isAllowed(""));
    }

    /** 埋点请求不转发上游，RestClient / 配置传 null 即可。 */
    private static HttpServletRequest logRequest(String callback) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/_AMapService/v3/log/init");
        when(request.getParameter("callback")).thenReturn(callback);
        return request;
    }

    @Test
    void logInitWrapsBodyInJsonpCallback() {
        AmapProxyController controller = new AmapProxyController(null, properties(), Clock.systemUTC());
        ResponseEntity<String> response = controller.proxy(logRequest("jsonp_123_"));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("application/javascript", String.valueOf(response.getHeaders().getContentType()));
        assertEquals(
                "jsonp_123_({\"status\":\"1\",\"info\":\"OK\",\"infocode\":\"10000\"})",
                response.getBody());
    }

    @Test
    void logInitFallsBackToJsonWithoutSafeCallback() {
        AmapProxyController controller = new AmapProxyController(null, properties(), Clock.systemUTC());
        for (String callback : new String[] {null, "", "alert(1)//", "cb;evil"}) {
            ResponseEntity<String> response = controller.proxy(logRequest(callback));
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("application/json", String.valueOf(response.getHeaders().getContentType()));
            assertEquals("{\"status\":\"1\",\"info\":\"OK\",\"infocode\":\"10000\"}", response.getBody());
        }
    }

    /** 浏览器只发 key；代理必须补 s=rsv3 + jscode，否则 JS API Key 被判平台不匹配（10009）。 */
    @Test
    void forwardsJsPlatformMarkerAndSecurityCode() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://restapi.amap.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AmapProxyController controller = new AmapProxyController(
                builder.build(), properties(), Clock.systemUTC());

        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/place/text")))
                .andExpect(queryParam("keywords", "tower"))
                .andExpect(queryParam("s", AmapProxyController.JS_PLATFORM))
                .andExpect(queryParam("key", "js-key"))
                .andExpect(queryParam("jscode", "security-code"))
                .andRespond(withSuccess("{\"status\":\"1\",\"info\":\"OK\"}", MediaType.APPLICATION_JSON));

        ResponseEntity<String> response = controller.proxy(placeSearchRequest());
        assertEquals(HttpStatus.OK, response.getStatusCode());
        server.verify();
    }

    /** 客户端自带的 s 参数不被覆盖（v3/v4 接口可能要求其他值）。 */
    @Test
    void keepsClientSuppliedPlatformMarker() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://restapi.amap.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AmapProxyController controller = new AmapProxyController(
                builder.build(), properties(), Clock.systemUTC());

        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/place/text")))
                .andExpect(queryParam("s", "custom"))
                .andRespond(withSuccess("{\"status\":\"1\",\"info\":\"OK\"}", MediaType.APPLICATION_JSON));

        controller.proxy(placeSearchRequest("custom"));
        server.verify();
    }

    /** 命中缓存时不再请求上游；JSONP 回调名逐次不同也不影响复用。 */
    @Test
    void cachesReadOnlyResponseAndWrapsEachCallback() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://restapi.amap.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AmapProxyController controller = new AmapProxyController(
                builder.build(), properties(), Clock.systemUTC());

        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/place/text")))
                .andRespond(withSuccess("{\"status\":\"1\",\"info\":\"OK\"}", MediaType.APPLICATION_JSON));

        ResponseEntity<String> first = controller.proxy(placeSearchRequest(Map.of("callback", "cb_first")));
        ResponseEntity<String> second = controller.proxy(placeSearchRequest(Map.of("callback", "cb_second")));

        assertEquals("cb_first({\"status\":\"1\",\"info\":\"OK\"})", first.getBody());
        assertEquals("cb_second({\"status\":\"1\",\"info\":\"OK\"})", second.getBody());
        server.verify();
    }

    /** refresh=true 跳过缓存读取，直接再打一次上游并覆盖缓存。 */
    @Test
    void refreshParameterBypassesCache() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://restapi.amap.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AmapProxyController controller = new AmapProxyController(
                builder.build(), properties(), Clock.systemUTC());

        for (String body : new String[] {"{\"status\":\"1\",\"info\":\"OK\"}", "{\"status\":\"1\",\"info\":\"NEW\"}"}) {
            server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/place/text")))
                    .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        }

        assertEquals("{\"status\":\"1\",\"info\":\"OK\"}", controller.proxy(placeSearchRequest(Map.of())).getBody());
        assertEquals(
                "{\"status\":\"1\",\"info\":\"NEW\"}",
                controller.proxy(placeSearchRequest(Map.of("refresh", "true"))).getBody());
        server.verify();
    }

    /** 上游失败（如 10021 配额超限）不写缓存，恢复正常后立刻能拿到新结果。 */
    @Test
    void doesNotCacheUpstreamFailure() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://restapi.amap.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AmapProxyController controller = new AmapProxyController(
                builder.build(), properties(), Clock.systemUTC());

        for (String body : new String[] {
                "{\"status\":\"0\",\"info\":\"CUQPS_HAS_EXCEEDED_THE_LIMIT\",\"infocode\":\"10021\"}",
                "{\"status\":\"1\",\"info\":\"OK\"}"}) {
            server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/place/text")))
                    .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        }

        assertEquals(
                "{\"status\":\"0\",\"info\":\"CUQPS_HAS_EXCEEDED_THE_LIMIT\",\"infocode\":\"10021\"}",
                controller.proxy(placeSearchRequest(Map.of())).getBody());
        assertEquals(
                "{\"status\":\"1\",\"info\":\"OK\"}",
                controller.proxy(placeSearchRequest(Map.of())).getBody(),
                "second request must reach the upstream instead of replaying the failure");
        server.verify();
    }

    /** DELETE /api/amap/cache 清空全部条目，并返回清理数量。 */
    @Test
    void clearCacheDropsCachedResponses() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://restapi.amap.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AmapProxyController controller = new AmapProxyController(
                builder.build(), properties(), Clock.systemUTC());

        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/place/text")))
                .andRespond(withSuccess("{\"status\":\"1\",\"info\":\"OK\"}", MediaType.APPLICATION_JSON));
        controller.proxy(placeSearchRequest(Map.of()));

        assertEquals(Map.of("cleared", 1), controller.clearCache());
    }

    /** v3/ip 是 JS API 的 Key 自检探针，缓存会掩盖配置错误。 */
    @Test
    void probePathIsNotCached() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://restapi.amap.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AmapProxyController controller = new AmapProxyController(
                builder.build(), properties(), Clock.systemUTC());

        for (int call = 0; call < 2; call++) {
            server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/ip")))
                    .andRespond(withSuccess("{\"status\":\"1\",\"info\":\"OK\"}", MediaType.APPLICATION_JSON));
        }

        controller.proxy(amapRequest("/_AMapService/v3/ip", Map.of()));
        controller.proxy(amapRequest("/_AMapService/v3/ip", Map.of()));
        server.verify();
    }

    /** 不改动参数时用默认搜索条件；额外参数（如 callback / refresh）由 Map 版本追加。 */
    private static HttpServletRequest placeSearchRequest(String... platformMarker) {
        Map<String, String> extra = new java.util.HashMap<>();
        extra.put("s", platformMarker.length > 0 ? platformMarker[0] : AmapProxyController.JS_PLATFORM);
        return placeSearchRequest(extra);
    }

    private static HttpServletRequest placeSearchRequest(Map<String, String> extraParameter) {
        Map<String, String[]> parameters = new java.util.HashMap<>();
        parameters.put("keywords", new String[] {"tower"});
        parameters.put("key", new String[] {"browser-key"});
        parameters.put("jscode", new String[] {"browser-code"});
        extraParameter.forEach((name, value) -> parameters.put(name, new String[] {value}));
        return amapRequest("/_AMapService/v3/place/text", parameters);
    }

    private static HttpServletRequest amapRequest(String uri, Map<String, String[]> parameters) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn(uri);
        when(request.getParameterMap()).thenReturn(parameters);
        when(request.getParameter(anyString())).thenAnswer(invocation -> {
            String[] values = parameters.get(invocation.getArgument(0, String.class));
            return values == null || values.length == 0 ? null : values[0];
        });
        return request;
    }
}