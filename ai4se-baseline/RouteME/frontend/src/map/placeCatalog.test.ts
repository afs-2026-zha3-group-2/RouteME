import { describe, expect, it } from 'vitest';
import {
  LAND_PATH,
  PLACES,
  cityProjection,
  findPlaceByName,
  nearestPlace,
  nearestPlaces,
  placesInCity,
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

    it('scopes places to one city for the waypoint map', () => {
      const zhuhai = placesInCity('珠海');
      expect(zhuhai.length).toBeGreaterThan(1);
      expect(zhuhai.every((place) => place.city === '珠海')).toBe(true);
      expect(zhuhai.map((place) => place.name)).toEqual(expect.arrayContaining(['珠海', '情侣路']));
      expect(placesInCity('不存在的城市')).toEqual([]);
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

  it('nearestPlaces returns ascending distances capped at the limit', () => {
    const point = projectPlace(findPlaceByName('广州塔')!);
    const result = nearestPlaces(point, 3);
    expect(result.length).toBe(3);
    expect(result[0].place.name).toBe('广州塔');
    expect(result[0].distance).toBeLessThanOrEqual(result[1].distance);
    expect(result[1].distance).toBeLessThanOrEqual(result[2].distance);
  });

  it('cityProjection spreads city places across the view box', () => {
    const projection = cityProjection('广州');
    const points = placesInCity('广州').map(projection.project);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(22);
    expect(Math.max(...xs)).toBeLessThanOrEqual(78);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(40);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40);
    // 真实投影下城内跨度仅 ~1 单位，局部投影必须显著展开。
    const real = placesInCity('广州').map(projectPlace);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(
      10 * (Math.max(...real.map((p) => p.x)) - Math.min(...real.map((p) => p.x))),
    );
  });

  it('cityProjection keeps a kilometre calibration for the scale bar', () => {
    const projection = cityProjection('广州');
    expect(projection.kmPerX).toBeGreaterThan(0);
    expect(projection.kmPerY).toBeGreaterThan(0);
    // 广州东西跨度约 0.08 经度 ≈ 8km，铺满 56 单位后每单位远小于 1km。
    expect(projection.kmPerX).toBeLessThan(1);
  });

  it('nearestPlaces honours a custom projection', () => {
    const projection = cityProjection('广州');
    const point = projection.project(findPlaceByName('北京路')!);
    const result = nearestPlaces(point, 1, placesInCity('广州'), projection.project);
    expect(result[0].place.name).toBe('北京路');
    expect(result[0].distance).toBeLessThan(1);
  });
});