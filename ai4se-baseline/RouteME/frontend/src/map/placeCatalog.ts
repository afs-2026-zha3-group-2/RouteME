/**
 * Offline place catalog facade（refine-trip-map R2 / design D18）。
 *
 * R2 起搜索/校验权威迁移到三级地图静态索引 `map/data/index.ts`，本文件
 * 仅 re-export 旧 API 口径（Place/lat-lng），保证 PlacePicker、发布校验、
 * 详情解析与既有 e2e 手输语义不变。旧省级投影视觉（LAND_PATH/ISLANDS/
 * cityProjection）随 PlaceMap 退役删除；距离估算仍走 mapView 真实投影。
 */

export {
  MAP_BOUNDS,
  projectLatLng,
  unprojectPoint,
  projectPlace,
  PLACES,
  CITY_NAMES,
  findPlaceByName,
  searchPlaces,
  resolvePlace,
  placesInCity,
  nearestPlaces,
  type Place,
  type PlaceKind,
  type PlaceSearchOptions,
  type NearestPlace,
  type Point,
} from './data/index';