import { describe, expect, it, vi } from 'vitest';
import {
  AmapApiError,
  amapErrorMessage,
  catalogPlaceResult,
  filterRelevantPlaces,
  firstTransit,
  formatDistance,
  formatDuration,
  haversineMeters,
  dedupeNearby,
  isRelevantName,
  longestCommonSubstring,
  matchCatalogPlace,
  normalizeName,
  parseTransitLeg,
  pickRegeocodeName,
  planRoute,
  rankPlaces,
  sortByDistance,
  straightLineRoute,
  toPlaceResult,
  toRouteLeg,
} from './AmapService';

// transit / walking 的 planRoute 用例用 SDK 替身，不加载真实高德脚本。
const { fakeAmap, transferCalls, transferOptions } = vi.hoisted(() => {
  const transferCalls: Array<{ origin: unknown; destination: unknown }> = [];
  const transferOptions: Array<Record<string, unknown> | undefined> = [];
  class Transfer {
    constructor(options?: Record<string, unknown>) {
      transferOptions.push(options);
    }
    search(origin: unknown, destination: unknown, cb: (status: string, result: unknown) => void) {
      transferCalls.push({ origin, destination });
      cb('complete', {
        routes: [{ transits: [{ distance: 1000, cost: { duration: 600 }, segments: [] }] }],
      });
    }
  }
  class Walking {
    search(_origin: unknown, _destination: unknown, cb: (status: string, result: unknown) => void) {
      cb('complete', { routes: [{ distance: 500, time: 400, steps: [] }] });
    }
  }
  const fakeAmap = {
    plugin: (_names: string[], cb?: () => void) => cb?.(),
    Transfer,
    Walking,
  };
  return { fakeAmap, transferCalls, transferOptions };
});

vi.mock('./loader', () => ({
  loadAmap: vi.fn(async () => fakeAmap),
}));

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

  it('parses raw REST steps whose polyline is a string', () => {
    // REST 原生 walking/driving steps 用 polyline 字符串（非 SDK path 对象数组）。
    const leg = toRouteLeg(
      {
        distance: '1200',
        time: '900',
        steps: [
          { polyline: '113.32,23.1;113.33,23.11' },
          { path: '113.33,23.11;113.34,23.12' },
        ],
      },
      [1, 2],
      [3, 4],
    );
    expect(leg.distanceMeters).toBe(1200);
    expect(leg.durationSeconds).toBe(900);
    expect(leg.path).toEqual([
      [113.32, 23.1],
      [113.33, 23.11],
      [113.34, 23.12],
    ]);
  });

  it('parses Riding results whose segments live in rides instead of steps', () => {
    // AMap.Riding 2.0 返回 routes[0].rides；只读 steps 会退化成两点直线。
    const leg = toRouteLeg(
      {
        distance: 4000,
        time: 960,
        rides: [
          { path: [lngLat(113.32, 23.1), lngLat(113.33, 23.11)] },
          { path: [lngLat(113.33, 23.11), lngLat(113.34, 23.12)] },
        ],
      },
      [113.3, 23.1],
      [113.4, 23.2],
    );
    expect(leg.distanceMeters).toBe(4000);
    expect(leg.durationSeconds).toBe(960);
    expect(leg.path).toEqual([
      [113.32, 23.1],
      [113.33, 23.11],
      [113.34, 23.12],
    ]);
  });

  it('merges rides after steps when both are present', () => {
    const leg = toRouteLeg(
      {
        distance: 10,
        time: 5,
        steps: [{ path: [lngLat(1, 1), lngLat(2, 2)] }],
        rides: [{ path: [lngLat(2, 2), lngLat(3, 3)] }],
      },
      [0, 0],
      [9, 9],
    );
    expect(leg.path).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
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

  it('explains a platform mismatch (10009) with actionable copy', () => {
    const message = amapErrorMessage(new AmapApiError('AUTH', 'auth', '10009'));
    expect(message).toContain('10009');
    expect(message).toContain('Web端');
    expect(message).toContain('s=rsv3');
  });

  it('explains an unpaired security code (10008)', () => {
    const message = amapErrorMessage(new AmapApiError('AUTH', 'auth', '10008'));
    expect(message).toContain('10008');
    expect(message).toContain('security-js-code');
  });

  it('explains an unpaired security code', () => {
    const message = amapErrorMessage(new AmapApiError('AUTH', 'auth', 'INVALID_USER_SCODE'));
    expect(message).toContain('jscode');
  });
});

describe('parseTransitLeg', () => {
  it('reads distance / duration and merges walking + bus polylines', () => {
    const leg = parseTransitLeg(
      {
        distance: '8200',
        cost: { duration: '2700' },
        segments: [
          { walking: { steps: [{ path: [lngLat(113.32, 23.1), lngLat(113.325, 23.105)] }] } },
          { bus: { buslines: [{ polyline: '113.325,23.105;113.33,23.11' }] } },
          { walking: { steps: [{ path: [lngLat(113.33, 23.11), lngLat(113.335, 23.115)] }] } },
        ],
      },
      [113.32, 23.1],
      [113.335, 23.115],
    );
    expect(leg.distanceMeters).toBe(8200);
    expect(leg.durationSeconds).toBe(2700);
    expect(leg.path).toEqual([
      [113.32, 23.1],
      [113.325, 23.105],
      [113.33, 23.11],
      [113.335, 23.115],
    ]);
  });

  it('falls back to the straight line when no segment has a path', () => {
    const leg = parseTransitLeg({ distance: 100, cost: { duration: 60 } }, [1, 2], [3, 4]);
    expect(leg.path).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('throws a route error when there is no transit at all', () => {
    expect(() => parseTransitLeg(undefined, [1, 2], [3, 4])).toThrow(AmapApiError);
  });

  it('parses the SDK 2.0 normalized plan shape (path + time + numeric fare)', () => {
    // 真实 SDK 2.0 Transfer 回调交付 plans[]：方案自带完整折线，时长在 time，
    // cost 为数值票价（T8 回调拦截证据 t8-transfer-cb.json）。
    const leg = parseTransitLeg(
      {
        distance: 2928,
        time: 1345,
        cost: 2,
        path: [lngLat(113.244, 23.107), lngLat(113.24, 23.105), lngLat(113.237, 23.114)],
      },
      [1, 2],
      [3, 4],
    );
    expect(leg.distanceMeters).toBe(2928);
    expect(leg.durationSeconds).toBe(1345);
    expect(leg.path).toEqual([
      [113.244, 23.107],
      [113.24, 23.105],
      [113.237, 23.114],
    ]);
  });

  it('merges SDK 2.0 segment transit paths when the plan has no path', () => {
    const leg = parseTransitLeg(
      {
        distance: 2100,
        time: 360,
        segments: [
          { transit: { path: [lngLat(113.24, 23.107), lngLat(113.245, 23.11)] } },
          { transit: { path: [lngLat(113.245, 23.11), lngLat(113.25, 23.115)] } },
        ],
      },
      [1, 2],
      [3, 4],
    );
    expect(leg.durationSeconds).toBe(360);
    expect(leg.path).toEqual([
      [113.24, 23.107],
      [113.245, 23.11],
      [113.25, 23.115],
    ]);
  });

  it('parses the raw REST v3 shape (polyline strings + top-level duration)', () => {
    // REST 原生结构（直连代理 / 降级兼容）：walking.steps[].polyline 为字符串，
    // 时长在顶层 duration，cost 为票价字符串（T8 证据 t8-transit-raw.json）。
    const leg = parseTransitLeg(
      {
        distance: '2848',
        duration: '1227',
        cost: '2.0',
        segments: [
          { walking: { steps: [{ polyline: '113.24,23.12;113.245,23.125' }] } },
          { bus: { buslines: [{ polyline: '113.245,23.125;113.25,23.13' }] } },
        ],
      },
      [113.24, 23.12],
      [113.25, 23.13],
    );
    expect(leg.distanceMeters).toBe(2848);
    expect(leg.durationSeconds).toBe(1227);
    expect(leg.path).toEqual([
      [113.24, 23.12],
      [113.245, 23.125],
      [113.25, 23.13],
    ]);
  });
});

describe('firstTransit', () => {
  const transit = { distance: 100, cost: { duration: 60 } };

  it('prefers the SDK 2.0 normalized plans shape', () => {
    const plan = { distance: 2928, time: 1345, cost: 2, path: [] };
    expect(firstTransit({ plans: [plan] })).toBe(plan);
    expect(firstTransit({ plans: [plan], routes: [{ transits: [transit] }] })).toBe(plan);
  });

  it('accepts the routes[0].transits shape', () => {
    expect(firstTransit({ routes: [{ transits: [transit] }] })).toBe(transit);
  });

  it('accepts the raw REST route.transits shape', () => {
    expect(firstTransit({ route: { transits: [transit] } })).toBe(transit);
  });

  it('returns undefined when neither shape carries a transit', () => {
    expect(firstTransit(undefined)).toBeUndefined();
    expect(firstTransit({})).toBeUndefined();
  });
});

describe('planRoute with the SDK stub', () => {
  const waypoints = [
    { id: 'a', name: '广州塔', lng: 113.3245, lat: 23.1064 },
    { id: 'b', name: '海心沙', lng: 113.3217, lat: 23.1104 },
    { id: 'c', name: '花城广场', lng: 113.3236, lat: 23.1203 },
  ];

  it('sums transit legs and passes the destination city', async () => {
    transferCalls.length = 0;
    transferOptions.length = 0;

    const plan = await planRoute('transit', waypoints, '广州市');

    expect(plan.mode).toBe('transit');
    expect(plan.distanceMeters).toBe(2000);
    expect(plan.durationSeconds).toBe(1200);
    expect(plan.legs).toEqual([
      { fromId: 'a', toId: 'b', distanceMeters: 1000, durationSeconds: 600 },
      { fromId: 'b', toId: 'c', distanceMeters: 1000, durationSeconds: 600 },
    ]);
    expect(transferCalls).toHaveLength(2);
    expect(transferOptions[0]?.city).toBe('广州市');
  });

  it('keeps the walking behaviour unchanged', async () => {
    const plan = await planRoute('walking', waypoints.slice(0, 2));
    expect(plan.mode).toBe('walking');
    expect(plan.distanceMeters).toBe(500);
    expect(plan.durationSeconds).toBe(400);
  });

  it('still rejects fewer than two waypoints', async () => {
    await expect(planRoute('transit', waypoints.slice(0, 1), '广州市')).rejects.toThrow(AmapApiError);
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
describe('name relevance (guards against fuzzy matches)', () => {
  const place = (name: string, address = '', lng = 0, lat = 0) => ({
    id: `${name}-${lng}-${lat}`,
    name,
    address,
    city: '',
    district: '',
    lng,
    lat,
    type: 'poi',
  });

  it('normalizes punctuation, brackets and admin suffixes', () => {
    expect(normalizeName(' 广州塔（地铁站） ')).toBe('广州塔');
    expect(normalizeName('淇澳岛风景区')).toBe('淇澳岛');
  });

  it('accepts containment but rejects shared prefixes', () => {
    expect(isRelevantName('广州塔', '广州塔广场')).toBe(true);
    expect(isRelevantName('海心沙', '海心沙亚运公园')).toBe(true);
    // 高德在中山把「淇澳岛」模糊匹配成「淇澳服饰」：只有共同前缀，必须拒绝。
    expect(isRelevantName('淇澳岛', '淇澳服饰')).toBe(false);
    expect(isRelevantName('淇澳岛', '南方软件园')).toBe(false);
  });

  it('drops unrelated fuzzy matches and keeps the real one', () => {
    const places = [
      place('淇澳服饰', '大涌镇悦新路2号', 113.3039, 22.467),
      place('淇澳岛', '唐家湾镇淇澳社区', 113.6357, 22.4151),
    ];
    const filtered = filterRelevantPlaces('淇澳岛', places);
    expect(filtered.map((item) => item.name)).toEqual(['淇澳岛']);
  });

  it('returns nothing when every candidate is unrelated', () => {
    expect(filterRelevantPlaces('淇澳岛', [place('南方软件园', '唐家湾镇')])).toEqual([]);
  });

  it('still accepts address matches (address search)', () => {
    const places = [place('某某大厦', '阅江西路222号广州塔内', 113.32, 23.1)];
    expect(filterRelevantPlaces('阅江西路', places)).toHaveLength(1);
  });

  it('ranks exact names before longer matches', () => {
    const ranked = rankPlaces('广州塔', [
      place('广州塔广场'),
      place('广州塔'),
      place('广州塔西登塔'),
    ]);
    expect(ranked[0].name).toBe('广州塔');
    expect(ranked[2].name).toBe('广州塔西登塔');
  });
});

describe('longest common substring', () => {
  it('measures shared content', () => {
    expect(longestCommonSubstring('香洲港集合', '香洲港客运码头')).toBe(3);
    expect(longestCommonSubstring('淇澳岛', '南方软件园')).toBe(0);
  });
});

describe('nearby distance helpers', () => {
  it('sorts nearby results by distance from the click', () => {
    const sorted = sortByDistance(
      [
        { id: 'far', name: '远处', address: '', city: '', district: '', lng: 113.65, lat: 22.43, type: 'poi' },
        { id: 'near', name: '近处', address: '', city: '', district: '', lng: 113.6358, lat: 22.4152, type: 'poi' },
      ],
      113.6357,
      22.4151,
    );
    expect(sorted.map((item) => item.id)).toEqual(['near', 'far']);
    expect(sorted[0].distanceMeters).toBeLessThan(100);
  });

  it('takes a short name from a reverse-geocoded address', () => {
    expect(pickRegeocodeName('广东省珠海市香洲区唐家湾镇淇澳社区')).toBe('淇澳社区');
    expect(pickRegeocodeName('')).toBe('');
  });
});

describe('dedupeNearby', () => {
  const spot = (id: string, lng: number, lat: number) => ({
    id,
    name: id,
    address: '',
    city: '广州',
    district: '',
    lng,
    lat,
    type: '风景名胜',
    distanceMeters: 0,
  });

  it('keeps one pin for spots that sit on top of each other', () => {
    const kept = dedupeNearby([
      spot('广州塔', 113.3245, 23.1064),
      spot('广州塔A区', 113.32455, 23.10643),
      spot('登塔大厅', 113.32452, 23.10641),
    ], 150);
    expect(kept.map((item) => item.id)).toEqual(['广州塔']);
  });

  it('keeps spots that are far enough apart', () => {
    const kept = dedupeNearby([
      spot('广州塔', 113.3245, 23.1064),
      spot('越秀公园', 113.2644, 23.1291),
    ], 700);
    expect(kept.map((item) => item.id)).toEqual(['广州塔', '越秀公园']);
  });
});