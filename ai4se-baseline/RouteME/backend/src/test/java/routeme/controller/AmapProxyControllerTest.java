package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletRequest;

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
}