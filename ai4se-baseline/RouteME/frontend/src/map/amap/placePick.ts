/**
 * 地图选点的纯逻辑：点击位置 → 途经点名称（同名按坐标区分）、点击点 → PlaceResult。
 *
 * <p>约束：点击位置的经纬度是唯一事实来源，逆地理只提供名称与地址；
 * 任何高德服务失败都不能把点挪到附近的 POI 上（那是「点哪儿偏哪儿」的根因）。
 */

import type { PlaceResult } from './AmapService';

export type PickedPoint = {
  lng: number;
  lat: number;
  /** 逆地理结果；服务不可用时为 null（名称按坐标生成）。 */
  place: PlaceResult | null;
};

/** 坐标展示口径：5 位小数约 ±1 米，足够选点使用。 */
export function formatCoords(lng: number, lat: number): string {
  return `${lng.toFixed(5)}, ${lat.toFixed(5)}`;
}

/** 点击点的兜底名称（高德不可用 / 逆地理无结果时使用）。 */
export function pointFallbackName(lng: number, lat: number): string {
  return `地图选点 ${formatCoords(lng, lat)}`;
}

/**
 * 坐标占位名判定：以 `pointFallbackName` 的前缀 + 一对坐标开头即命中。
 *
 * <p>不要求结尾：同名重复时 `pickedPlaceName` 会在占位名后追加「（坐标）」，
 * 这类名字仍然是地图选点，不能被当成可读地名发布。
 */
const COORDINATE_PLACEHOLDER = /^地图选点\s+-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/;

export function isCoordinatePlaceholderName(name: string): boolean {
  return COORDINATE_PLACEHOLDER.test(name.trim());
}

/**
 * 点击点 → 途经点名称。
 *
 * <p>同名地点（同一条街的不同位置、两次「地图选点」）追加坐标，
 * 否则表单的 `string[]` 会因为名字相同而互相覆盖或去重。
 */
export function pickedPlaceName(
  base: string,
  lng: number,
  lat: number,
  existing: readonly string[],
): string {
  const trimmed = base.trim();
  const name = trimmed === '' ? pointFallbackName(lng, lat) : trimmed;
  if (!existing.includes(name)) {
    return name;
  }
  const withCoords = `${name}（${formatCoords(lng, lat)}）`;
  return existing.includes(withCoords) ? `${withCoords} #${existing.length + 1}` : withCoords;
}

/** 点击点 → PlaceResult：坐标永远等于点击位置，名称/地址只做展示。 */
export function toPickedPlace(point: PickedPoint, name: string): PlaceResult {
  return {
    id: `point-${point.lng.toFixed(6)},${point.lat.toFixed(6)}`,
    name,
    address: point.place?.address ?? '',
    city: point.place?.city ?? '',
    district: point.place?.district ?? '',
    lng: point.lng,
    lat: point.lat,
    type: 'point',
    approximate: false,
  };
}

/** 同一位置是否已经在已选列表里（1e-6 度约 0.1 米，视为同一点）。 */
export function findSamePoint(
  places: readonly PlaceResult[],
  lng: number,
  lat: number,
): PlaceResult | undefined {
  return places.find(
    (place) => Math.abs(place.lng - lng) < 1e-6 && Math.abs(place.lat - lat) < 1e-6,
  );
}