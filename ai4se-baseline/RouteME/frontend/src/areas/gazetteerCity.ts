import { findCity } from '../area/areaOptions';
import { PLACES } from '../map/placeCatalog';

/** Cities the offline gazetteer can draw; anything else has no map or points. */
const COVERED_CITIES = new Set(PLACES.map((place) => place.city));

/**
 * 目的地代码 → 离线地名库城市。
 *
 * 地名库按城市组织点位；香港 / 澳门二级区（香港岛、九龙、新界、澳门半岛、离岛）
 * 共用地名库里的「香港」「澳门」。返回 `undefined` 表示该目的地没有离线点位，
 * 此时不渲染地图。
 */
export function gazetteerCityForCode(code: string): string | undefined {
  if (code === '') {
    return undefined;
  }
  const city = findCity(code);
  if (city === undefined) {
    return undefined;
  }
  if (city.provinceCode === '810000') {
    return COVERED_CITIES.has('香港') ? '香港' : undefined;
  }
  if (city.provinceCode === '820000') {
    return COVERED_CITIES.has('澳门') ? '澳门' : undefined;
  }
  // 行政区划字典的名称带「市」后缀，离线地名库用简称。
  const name = city.cityName.replace(/市$/, '');
  return COVERED_CITIES.has(name) ? name : undefined;
}