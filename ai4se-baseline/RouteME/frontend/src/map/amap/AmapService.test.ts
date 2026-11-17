import { describe, expect, it } from 'vitest';
import {
  AmapApiError,
  amapErrorMessage,
  formatDistance,
  formatDuration,
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
});