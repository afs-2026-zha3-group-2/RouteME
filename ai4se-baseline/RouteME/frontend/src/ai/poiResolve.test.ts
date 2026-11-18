import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiPlanStop, PlaceResult } from '../types';

vi.mock('../map/amap/AmapService', () => ({
  geocodePlace: vi.fn(),
}));

import { geocodePlace } from '../map/amap/AmapService';
import { resolveStops } from './poiResolve';

const mockedGeocode = vi.mocked(geocodePlace);

const stop = (name: string): AiPlanStop => ({
  name,
  reason: `${name}推荐理由`,
  arrival: '09:00',
  stay_minutes: 120,
  indoor: false,
});

const place = (name: string, lng: number, lat: number): PlaceResult => ({
  id: `poi-${name}`,
  name,
  address: '广州市',
  city: '广州市',
  district: '海珠区',
  lng,
  lat,
  type: '风景名胜',
});

beforeEach(() => {
  mockedGeocode.mockReset();
});

describe('resolveStops', () => {
  it('attaches real AMap coordinates and list order on success', async () => {
    mockedGeocode.mockResolvedValueOnce(place('广州塔', 113.3245, 23.1064));

    const resolved = await resolveStops([stop('广州塔')], '广州市');

    expect(resolved).toEqual([
      {
        ...stop('广州塔'),
        order: 1,
        lng: 113.3245,
        lat: 23.1064,
        city: '广州市',
        resolved: true,
      },
    ]);
    expect(mockedGeocode).toHaveBeenCalledWith('广州塔', '广州市');
  });

  it('marks missing results as unresolved without fabricating coordinates', async () => {
    mockedGeocode.mockResolvedValueOnce(null);

    const [resolved] = await resolveStops([stop('神秘景点')], '广州市');

    expect(resolved.resolved).toBe(false);
    expect(resolved.order).toBe(1);
    expect('lng' in resolved).toBe(false);
    expect('lat' in resolved).toBe(false);
    expect(resolved.name).toBe('神秘景点');
    expect(resolved.reason).toBe('神秘景点推荐理由');
  });

  it('treats AMap errors as unresolved instead of throwing', async () => {
    mockedGeocode.mockRejectedValueOnce(new Error('AMAP_ERROR'));

    const [resolved] = await resolveStops([stop('广州塔')]);

    expect(resolved.resolved).toBe(false);
    expect('lng' in resolved).toBe(false);
  });

  it('keeps list order across partial failures', async () => {
    mockedGeocode
      .mockResolvedValueOnce(place('广州塔', 113.3245, 23.1064))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(place('花城广场', 113.3236, 23.1203));

    const resolved = await resolveStops(
      [stop('广州塔'), stop('神秘景点'), stop('花城广场')],
      '广州市',
    );

    expect(resolved.map((item) => item.order)).toEqual([1, 2, 3]);
    expect(resolved.map((item) => item.resolved)).toEqual([true, false, true]);
    expect(resolved[2].lng).toBe(113.3236);
  });
});