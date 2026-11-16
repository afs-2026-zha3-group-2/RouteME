import { describe, expect, it } from 'vitest';
import {
  LAND_PATH,
  PLACES,
  findPlaceByName,
  nearestPlace,
  projectLatLng,
  projectPlace,
  resolvePlace,
  searchPlaces,
  unprojectPoint,
} from './placeCatalog';

describe('place catalog', () => {
  it('offers the main Guangdong cities as destinations', () => {
    const cities = PLACES.filter((place) => place.kind === 'city').map((place) => place.name);
    expect(cities).toEqual(expect.arrayContaining(['珠海', '广州', '深圳', '佛山']));
    expect(cities.length).toBeGreaterThanOrEqual(8);
  });

  it('resolves names and aliases exactly', () => {
    expect(findPlaceByName('珠海')?.name).toBe('珠海');
    expect(findPlaceByName('珠海市')?.name).toBe('珠海');
    expect(resolvePlace('小蛮腰')?.name).toBe('广州塔');
    expect(resolvePlace('维港')?.name).toBe('维多利亚港');
  });

  it('rejects text that the map cannot find', () => {
    expect(resolvePlace('火星基地')).toBeUndefined();
    expect(resolvePlace('   ')).toBeUndefined();
    expect(findPlaceByName('不存在的城市')).toBeUndefined();
  });

  it('searches by partial name and city', () => {
    const names = searchPlaces('湾').map((place) => place.name);
    expect(names).toEqual(expect.arrayContaining(['深圳湾公园']));

    const zhuhai = searchPlaces('珠海').map((place) => place.name);
    expect(zhuhai).toEqual(expect.arrayContaining(['珠海', '情侣路']));
  });

  it('limits search results', () => {
    expect(searchPlaces('岛', { limit: 2 }).length).toBeLessThanOrEqual(2);
  });

  it('round-trips projection', () => {
    const point = projectLatLng(22.27, 113.58);
    const back = unprojectPoint(point);
    expect(back.lat).toBeCloseTo(22.27, 6);
    expect(back.lng).toBeCloseTo(113.58, 6);
  });

  it('snaps a map click to the nearest place', () => {
    const zhuhai = PLACES.find((place) => place.name === '珠海');
    expect(zhuhai).toBeDefined();
    const point = projectPlace(zhuhai as (typeof PLACES)[number]);
    const nearest = nearestPlace({ x: point.x + 0.5, y: point.y + 0.5 });
    expect(nearest.place.city).toBe('珠海');
    expect(nearest.distance).toBeLessThan(3);
  });

  it('draws a closed land path inside the viewBox', () => {
    expect(LAND_PATH.startsWith('M')).toBe(true);
    expect(LAND_PATH.endsWith('Z')).toBe(true);
    const numbers = LAND_PATH.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    expect(numbers.length).toBeGreaterThan(0);
    expect(numbers.every((value) => value >= 0 && value <= 100)).toBe(true);
  });
});