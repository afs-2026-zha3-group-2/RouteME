import { describe, expect, it } from 'vitest';
import {
  AmapApiError,
  amapErrorMessage,
  formatDistance,
  formatDuration,
  parseGeocodeResults,
  parseLocation,
  parsePlaces,
  parseRouteLeg,
} from './AmapService';

describe('AmapService parsing', () => {
  it('parses locations and rejects malformed values', () => {
    expect(parseLocation('113.3245,23.1064')).toEqual([113.3245, 23.1064]);
    expect(parseLocation('')).toBeNull();
    expect(parseLocation('not-a-point')).toBeNull();
  });

  it('parses POIs, including array-form AMap fields', () => {
    const places = parsePlaces({
      status: '1',
      pois: [
        {
          id: 'B0FFH123',
          name: '广州塔',
          address: [],
          cityname: ['广州市'],
          adname: ['海珠区'],
          location: '113.3245,23.1064',
          type: '风景名胜;地标景点',
        },
        { name: '缺少坐标', location: '' },
      ],
    });
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      id: 'B0FFH123',
      name: '广州塔',
      address: '',
      city: '广州市',
      district: '海珠区',
      lng: 113.3245,
      lat: 23.1064,
    });
  });

  it('flattens step polylines into one leg path', () => {
    const leg = parseRouteLeg(
      {
        status: '1',
        route: {
          paths: [
            {
              distance: '1200',
              duration: '900',
              steps: [
                { polyline: '113.32,23.10;113.33,23.11' },
                { polyline: '113.33,23.11;113.34,23.12' },
              ],
            },
          ],
        },
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

  it('falls back to the straight line when a route has no polyline', () => {
    const leg = parseRouteLeg(
      { status: '1', route: { paths: [{ distance: '10', duration: '5' }] } },
      [1, 2],
      [3, 4],
    );
    expect(leg.path).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('parses geocode fallbacks', () => {
    expect(
      parseGeocodeResults(
        {
          status: '1',
          geocodes: [
            {
              location: '113.2,23.1',
              formatted_address: '广东省广州市海珠区广州塔',
              city: ['广州市'],
              district: ['海珠区'],
            },
          ],
        },
        '广州塔',
      )[0],
    ).toMatchObject({ name: '广州塔', id: 'geo-113.2-23.1', city: '广州市' });
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
    expect(amapErrorMessage(new AmapApiError('ROUTE_NOT_FOUND', 'none'))).toContain('路线');
    expect(amapErrorMessage(new AmapApiError('AMAP_ERROR', 'x', '20800'))).toContain('20800');
  });
});