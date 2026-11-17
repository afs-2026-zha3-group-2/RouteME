import { describe, expect, it } from 'vitest';
import {
  PLACES,
  findPlaceByName,
  nearestPlaces,
  placesInCity,
  projectLatLng,
  projectPlace,
  resolvePlace,
  searchPlaces,
  unprojectPoint,
} from './placeCatalog';
import {
  CITY_INDEX,
  citiesInProvince,
  cityIndexByCode,
  cityIndexByName,
  poiLatLng,
} from './data/index';

describe('place catalog facade（R2 静态索引同源）', () => {
  it('offers the main Guangdong cities as destinations', () => {
    const cities = PLACES.filter((place) => place.kind === 'city').map((place) => place.name);
    expect(cities).toEqual(expect.arrayContaining(['珠海', '广州', '深圳', '佛山']));
    expect(cities.length).toBeGreaterThanOrEqual(8);
  });

  it('covers the ten MVP cities in the lightweight index', () => {
    const names = CITY_INDEX.map((city) => city.name);
    expect(names).toEqual(
      expect.arrayContaining(['北京', '上海', '广州', '深圳', '成都', '重庆', '杭州', '西安', '南京', '苏州']),
    );
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

  it('resolves the new Guangzhou demo POIs (U9)', () => {
    expect(resolvePlace('海心沙')?.name).toBe('海心沙');
    expect(resolvePlace('花城广场')?.name).toBe('花城广场');
    expect(resolvePlace('广东省博物馆')?.name).toBe('广东省博物馆');
    expect(resolvePlace('陈家祠地铁站')?.name).toBe('陈家祠');
    expect(resolvePlace('香洲港')?.city).toBe('珠海');
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

  it('nearestPlaces returns ascending distances capped at the limit', () => {
    const point = projectPlace(findPlaceByName('广州塔')!);
    const result = nearestPlaces(point, 3);
    expect(result.length).toBe(3);
    expect(result[0].place.name).toBe('广州塔');
    expect(result[0].distance).toBeLessThanOrEqual(result[1].distance);
    expect(result[1].distance).toBeLessThanOrEqual(result[2].distance);
  });

  it('legacy city POIs keep local 22..78 spread (R1 展开度口径)', () => {
    const zhuhai = cityIndexByName('珠海')!;
    const xs = zhuhai.pois.map((poi) => poi.x);
    const ys = zhuhai.pois.map((poi) => poi.y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(22);
    expect(Math.max(...xs)).toBeLessThanOrEqual(78);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(40);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40);
  });

  it('legacy POI lat/lng round-trips through the local calibration', () => {
    const zhuhai = cityIndexByName('珠海')!;
    const xiangzhou = zhuhai.pois.find((poi) => poi.name === '香洲港')!;
    const { lat, lng } = poiLatLng(zhuhai, xiangzhou);
    expect(lat).toBeCloseTo(22.29, 2);
    expect(lng).toBeCloseTo(113.6, 2);
  });

  it('keeps a kilometre calibration for estimates and the scale bar', () => {
    for (const city of CITY_INDEX) {
      expect(city.kmPerX).toBeGreaterThan(0);
      expect(city.kmPerY).toBeGreaterThan(0);
    }
    // 广州手工布局每单位远小于 1km（城内步行尺度）。
    expect(cityIndexByName('广州')!.kmPerX).toBeLessThan(1);
  });

  it('nearestPlaces honours a custom local projection', () => {
    const guangzhou = cityIndexByName('广州')!;
    const project = (place: (typeof PLACES)[number]) => {
      const poi = guangzhou.pois.find((entry) => entry.id === place.id);
      return poi === undefined ? projectPlace(place) : { x: poi.x, y: poi.y };
    };
    const point = project(findPlaceByName('北京路')!);
    const result = nearestPlaces(point, 1, placesInCity('广州'), project);
    expect(result[0].place.name).toBe('北京路');
    expect(result[0].distance).toBeLessThan(1);
  });

  it('normalises HK/Macau secondary codes and groups cities by province', () => {
    expect(cityIndexByCode('810001')?.name).toBe('香港');
    expect(cityIndexByCode('820003')?.name).toBe('澳门');
    expect(cityIndexByCode('999999')).toBeUndefined();
    const guangdong = citiesInProvince('440000').map((city) => city.name);
    expect(guangdong).toEqual(expect.arrayContaining(['广州', '深圳', '珠海', '佛山', '东莞']));
  });
});