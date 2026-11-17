/**
 * WGS-84 → GCJ-02 坐标纠偏。
 *
 * <p>浏览器 `navigator.geolocation` 返回 WGS-84，而高德底图/瓦片是 GCJ-02
 * （火星坐标系）。直接把 WGS-84 画在 GCJ-02 地图上，在中国境内会有约
 * 300–800 米的固定偏移，「定位到我的位置」看起来就像漂到了隔壁街区。
 *
 * <p>这里用公开的偏移算法做一次转换；境外坐标原样返回（GCJ-02 只在境内偏移）。
 */

const PI = Math.PI;
/** 克拉索夫斯基椭球参数。 */
const A = 6378245.0;
const EE = 0.00669342162296594323;

export type LatLng = { lat: number; lng: number };

/** 境外（含港澳台以外的海外）不做偏移。 */
export function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(lng: number, lat: number): number {
  let value =
    -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  value += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  value += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0;
  value += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0;
  return value;
}

function transformLng(lng: number, lat: number): number {
  let value = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  value += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  value += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0;
  value += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0;
  return value;
}

/** WGS-84 经纬度 → GCJ-02 经纬度。 */
export function wgs84ToGcj02(lng: number, lat: number): LatLng {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || outOfChina(lng, lat)) {
    return { lng, lat };
  }
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return { lng: lng + dLng, lat: lat + dLat };
}