import { describe, expect, it, vi } from 'vitest';
import {
  AmapApiError,
  amapErrorMessage,
  formatDistance,
  formatDuration,
  parseTransitLeg,
  firstTransit,
  planRoute,
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