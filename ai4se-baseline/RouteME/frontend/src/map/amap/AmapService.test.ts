import { describe, expect, it } from 'vitest';
import {
  AmapApiError,
  amapErrorMessage,
  catalogPlaceResult,
  formatDistance,
  formatDuration,
  haversineMeters,
  matchCatalogPlace,
  straightLineRoute,
  toPlaceResult,
  toRouteLeg,
} from './AmapService';

const lngLat = (lng: number, lat: number) => ({
  getLng: () => lng,
  getLat: () => lat,
});

describe('AmapService mapping', () => {
  it('maps an SDK POI to a RouteMe place', () => {
    expect(
      toPlaceResult({
        id: 'B0FFH123',
        name: '广州塔',
        address: [],
        cityname: ['广州市'],
        adname: ['海珠区'],
        type: '风景名胜;地标景点',
        location: lngLat(113.3245, 23.1064),
      }),
    ).toEqual({
      id: 'B0FFH123',
      name: '广州塔',
      address: '',
      city: '广州市',
      district: '海珠区',
      lng: 113.3245,
      lat: 23.1064,
      type: '风景名胜;地标景点',
    });
  });

  it('drops POIs without a name or coordinates', () => {
    expect(toPlaceResult({ name: '缺少坐标' })).toBeNull();
    expect(toPlaceResult({ location: lngLat(1, 2) })).toBeNull();
  });

  it('merges step paths into one deduplicated leg', () => {
    const leg = toRouteLeg(
      {
        distance: 1200,
        time: 900,
        steps: [
          { path: [lngLat(113.32, 23.1), lngLat(113.33, 23.11)] },
          { path: [lngLat(113.33, 23.11), lngLat(113.34, 23.12)] },
        ],
      },
      [113.3, 23.1],
      [113.4, 23.2],
    );
    expect(leg.distanceMeters).toBe(1200);
    expect(leg.durationSeconds).toBe(900);
    expect(leg.path).toEqual([
      [113.32, 23.1],
      [113.33, 23.11],
      [113.34, 23.12],
    ]);
  });

  it('falls back to the straight line when a route has no path', () => {
    expect(toRouteLeg({ distance: 10, time: 5 }, [1, 2], [3, 4]).path).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('throws a route error when there is no route at all', () => {
    expect(() => toRouteLeg(undefined, [1, 2], [3, 4])).toThrow(AmapApiError);
  });

  it('formats distance and duration for the sidebar', () => {
    expect(formatDistance(860)).toBe('860 米');
    expect(formatDistance(4321)).toBe('4.3 公里');
    expect(formatDuration(90)).toBe('2 分钟');
    expect(formatDuration(5400)).toBe('1 小时 30 分钟');
    expect(formatDuration(0)).toBe('—');
  });

  it('maps AMap error codes to readable Chinese copy', () => {
    expect(amapErrorMessage(new AmapApiError('QUOTA', 'quota'))).toContain('配额');
    expect(amapErrorMessage(new AmapApiError('AUTH', 'auth'))).toContain('Key');
    expect(amapErrorMessage(new AmapApiError('NO_RESULT', 'none'))).toContain('地点');
    expect(amapErrorMessage(new AmapApiError('ROUTE_NOT_FOUND', 'none'))).toContain('路线');
    expect(amapErrorMessage(new AmapApiError('AMAP_ERROR', 'x', '20800'))).toContain('20800');
  });

  it('names the backend proxy when it is unreachable', () => {
    const message = amapErrorMessage(new AmapApiError('PROXY_UNAVAILABLE', 'down'));
    expect(message).toContain('后端');
    expect(message).toContain('8080');
  });

  it('names the AMap upstream when the proxy forward fails', () => {
    expect(amapErrorMessage(new AmapApiError('UPSTREAM_UNAVAILABLE', 'forward'))).toContain('上游');
  });
});

describe('offline gazetteer fallback', () => {
  it('resolves a city and its demo stop inside the trip city', () => {
    expect(matchCatalogPlace('深圳', '深圳')?.name).toBe('深圳');
    expect(matchCatalogPlace('大鹏所城', '深圳')?.name).toBe('大鹏所城');
  });

  it('tolerates itinerary suffixes around a catalog name', () => {
    // 集合 / 穿越 12km / 观景 / 骑行 都是行程文案，不是地点名的一部分。
    expect(matchCatalogPlace('大鹏所城集合', '深圳')?.name).toBe('大鹏所城');
    expect(matchCatalogPlace('东西涌穿越 12km', '深圳')?.name).toBe('东西涌');
    expect(matchCatalogPlace('天文台观景', '深圳')?.name).toBe('西涌天文台');
    expect(matchCatalogPlace('次日杨梅坑骑行', '深圳')?.name).toBe('杨梅坑');
    expect(matchCatalogPlace('情侣路骑行段', '珠海')?.name).toBe('情侣路');
  });

  it('prefers the longest matching name and skips the city node', () => {
    expect(matchCatalogPlace('深圳湾公园日落', '深圳')?.name).toBe('深圳湾公园');
  });

  it('does not place a stop outside its trip city', () => {
    expect(matchCatalogPlace('大鹏所城', '珠海')).toBeNull();
    expect(matchCatalogPlace('大鹏所城集合', '拉萨')).toBeNull();
  });

  it('builds a place result with real coordinates', () => {
    const place = catalogPlaceResult('海滨泳场日落机位', '珠海');
    expect(place).toMatchObject({ name: '海滨泳场', city: '珠海', type: 'offline' });
    expect(place?.lng).toBeCloseTo(113.586, 3);
    expect(place?.lat).toBeCloseTo(22.2572, 3);
  });
});

describe('straight-line route fallback', () => {
  const waypoints = [
    { id: 'a', name: '大鹏所城', lng: 114.5077, lat: 22.5979 },
    { id: 'b', name: '东西涌', lng: 114.571, lat: 22.545 },
    { id: 'c', name: '杨梅坑', lng: 114.5654, lat: 22.5481 },
  ];

  it('keeps the waypoint order and marks the plan as estimated', () => {
    const plan = straightLineRoute('walking', waypoints);
    expect(plan.estimated).toBe(true);
    expect(plan.path).toEqual([
      [114.5077, 22.5979],
      [114.571, 22.545],
      [114.5654, 22.5481],
    ]);
    expect(plan.legs.map((leg) => [leg.fromId, leg.toId])).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ]);
    expect(plan.distanceMeters).toBeGreaterThan(0);
    expect(plan.durationSeconds).toBeGreaterThan(0);
  });

  it('estimates distance with the haversine formula', () => {
    // 广州塔 → 海心沙约 1.5km。
    const meters = haversineMeters([113.3245, 23.1064], [113.3245, 23.12]);
    expect(meters).toBeGreaterThan(1400);
    expect(meters).toBeLessThan(1600);

    const plan = straightLineRoute('driving', waypoints);
    expect(plan.distanceMeters).toBe(plan.legs.reduce((sum, leg) => sum + leg.distanceMeters, 0));
  });

  it('rejects a route with fewer than two waypoints', () => {
    expect(() => straightLineRoute('walking', [waypoints[0]])).toThrow(AmapApiError);
  });
});