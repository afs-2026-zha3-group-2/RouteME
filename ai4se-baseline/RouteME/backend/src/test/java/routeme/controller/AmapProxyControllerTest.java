package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

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
        AmapProxyController controller = new AmapProxyController(null, null);
        ResponseEntity<String> response = controller.proxy(logRequest("jsonp_123_"));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("application/javascript", String.valueOf(response.getHeaders().getContentType()));
        assertEquals(
                "jsonp_123_({\"status\":\"1\",\"info\":\"OK\",\"infocode\":\"10000\"})",
                response.getBody());
    }

    @Test
    void logInitFallsBackToJsonWithoutSafeCallback() {
        AmapProxyController controller = new AmapProxyController(null, null);
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
        AmapProperties properties = new AmapProperties("js-key", "security-code", null);
        AmapProxyController controller = new AmapProxyController(builder.build(), properties);

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
        AmapProperties properties = new AmapProperties("js-key", "security-code", null);
        AmapProxyController controller = new AmapProxyController(builder.build(), properties);

        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://restapi.amap.com/v3/place/text")))
                .andExpect(queryParam("s", "custom"))
                .andRespond(withSuccess("{\"status\":\"1\",\"info\":\"OK\"}", MediaType.APPLICATION_JSON));

        controller.proxy(placeSearchRequest("custom"));
        server.verify();
    }

    private static HttpServletRequest placeSearchRequest(String... platformMarker) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/_AMapService/v3/place/text");
        Map<String, String[]> parameters = new java.util.HashMap<>();
        parameters.put("keywords", new String[] {"tower"});
        parameters.put("key", new String[] {"browser-key"});
        parameters.put("jscode", new String[] {"browser-code"});
        if (platformMarker.length > 0) {
            parameters.put("s", new String[] {platformMarker[0]});
        }
        when(request.getParameterMap()).thenReturn(parameters);
        return request;
    }
}