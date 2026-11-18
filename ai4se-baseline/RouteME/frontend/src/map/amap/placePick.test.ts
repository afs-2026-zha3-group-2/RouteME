import { describe, expect, it } from 'vitest';
import type { PlaceResult } from './AmapService';
import {
  findSamePoint,
  formatCoords,
  isCoordinatePlaceholderName,
  pickedPlaceName,
  pointFallbackName,
  toPickedPlace,
} from './placePick';

function place(overrides: Partial<PlaceResult> = {}): PlaceResult {
  return {
    id: 'poi-1',
    name: '广州塔',
    address: '阅江西路 222 号',
    city: '广州',
    district: '海珠区',
    lng: 113.3245,
    lat: 23.1064,
    type: '风景名胜',
    ...overrides,
  };
}

describe('formatCoords / pointFallbackName', () => {
  it('formats to five decimals', () => {
    expect(formatCoords(113.32452, 23.10641)).toBe('113.32452, 23.10641');
  });

  it('builds a readable fallback name from the clicked point', () => {
    expect(pointFallbackName(113.32452, 23.10641)).toBe('地图选点 113.32452, 23.10641');
  });
});

describe('pickedPlaceName', () => {
  it('keeps the resolved name when it is still unique', () => {
    expect(pickedPlaceName('陈家祠', 113.2453, 23.1294, [])).toBe('陈家祠');
  });

  it('appends coordinates when two picks share a name', () => {
    const name = pickedPlaceName('中山路', 113.27, 23.12, ['中山路']);
    expect(name).toBe('中山路（113.27000, 23.12000）');
  });

  it('falls back to the coordinate name when the reverse geocode is empty', () => {
    expect(pickedPlaceName('  ', 113.1, 23.2, [])).toBe('地图选点 113.10000, 23.20000');
  });

  it('stays unique even when the coordinate variant is taken', () => {
    const existing = ['中山路', '中山路（113.27000, 23.12000）'];
    expect(pickedPlaceName('中山路', 113.27, 23.12, existing)).toBe(
      '中山路（113.27000, 23.12000） #3',
    );
  });
});

describe('toPickedPlace', () => {
  it('keeps the clicked coordinates instead of the reverse-geocode position', () => {
    const picked = toPickedPlace(
      { lng: 113.3, lat: 23.1, place: place({ lng: 113.5, lat: 23.4 }) },
      '我点的位置',
    );
    expect(picked).toMatchObject({
      name: '我点的位置',
      address: '阅江西路 222 号',
      lng: 113.3,
      lat: 23.1,
      type: 'point',
      approximate: false,
    });
  });

  it('works without a reverse-geocode result', () => {
    const picked = toPickedPlace({ lng: 113.3, lat: 23.1, place: null }, '地图选点');
    expect(picked).toMatchObject({ address: '', city: '', district: '', lng: 113.3, lat: 23.1 });
  });
});

describe('isCoordinatePlaceholderName', () => {
  it('treats the five-decimal map pick fallback as a coordinate placeholder', () => {
    expect(isCoordinatePlaceholderName(pointFallbackName(113.5767, 22.2859))).toBe(true);
    expect(isCoordinatePlaceholderName('地图选点 113.57670, 22.28590')).toBe(true);
  });

  it('rejects coordinate spellings with other decimal lengths and negative values', () => {
    expect(isCoordinatePlaceholderName('地图选点 113, 22')).toBe(true);
    expect(isCoordinatePlaceholderName('地图选点 -113.5767, -22.2859')).toBe(true);
    expect(isCoordinatePlaceholderName('地图选点 113.5767, 22.2859（113.57670, 22.28590）')).toBe(
      true,
    );
  });

  it('keeps readable names that merely mention coordinates', () => {
    expect(isCoordinatePlaceholderName('中山路（113.27000, 23.12000）')).toBe(false);
    expect(isCoordinatePlaceholderName('香洲港 地图选点 113.5, 22.2')).toBe(false);
  });

  it('keeps POI names returned by search', () => {
    expect(isCoordinatePlaceholderName('广州塔')).toBe(false);
    expect(isCoordinatePlaceholderName('')).toBe(false);
  });
});

describe('findSamePoint', () => {
  it('treats sub-metre differences as the same point', () => {
    const same = findSamePoint([place()], 113.3245, 23.1064);
    expect(same?.name).toBe('广州塔');
  });

  it('does not treat a distant point as duplicate', () => {
    expect(findSamePoint([place()], 113.33, 23.11)).toBeUndefined();
  });
});