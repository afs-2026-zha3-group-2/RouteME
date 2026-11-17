package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

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
}