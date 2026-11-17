/**
 * 高德 Web 服务客户端（搜索 / 逆地理 / 步行、驾车、骑行路线）。
 *
 * 所有请求都经同源 `/api/amap` 代理，业务层只依赖本文件的 RouteMe 数据模型，
 * 不直接依赖高德实例或原始字段。纯解析函数单独导出，便于在 Node 环境测试。
 */

import { amapProxyUrl } from './config';
import type { LngLat } from './types';

export type TravelMode = 'walking' | 'driving' | 'bicycling';

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  lng: number;
  lat: number;
  type: string;
};

export type RouteWaypoint = {
  id: string;
  name: string;
  address?: string;
  lng: number;
  lat: number;
};

export type RoutePlan = {
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  path: LngLat[];
  legs: Array<{
    fromId: string;
    toId: string;
    distanceMeters: number;
    durationSeconds: number;
  }>;
};

type AmapPoi = {
  id?: string;
  name?: string;
  address?: string | string[];
  cityname?: string | string[];
  adname?: string | string[];
  location?: string;
  type?: string;
};

type AmapGeocode = {
  location?: string;
  formatted_address?: string;
  province?: string | string[];
  city?: string | string[];
  district?: string | string[];
};

type AmapPath = {
  distance?: string;
  duration?: string;
  steps?: Array<{ polyline?: string }>;
};

export type AmapResponse = {
  status?: string;
  info?: string;
  infocode?: string;
  pois?: AmapPoi[];
  geocodes?: AmapGeocode[];
  route?: { paths?: AmapPath[] };
};

export type AmapErrorCode =
  | 'NOT_CONFIGURED'
  | 'MISSING_JS_KEY'
  | 'NETWORK'
  | 'AUTH'
  | 'QUOTA'
  | 'AMAP_ERROR'
  | 'BAD_RESPONSE'
  | 'ROUTE_NOT_FOUND'
  | 'INVALID_WAYPOINTS';

/** 高德错误统一包装，UI 只读取 code/infocode，不解析原始 JSON。 */
export class AmapApiError extends Error {
  readonly code: AmapErrorCode;
  readonly infocode: string;

  constructor(code: AmapErrorCode, message: string, infocode = '') {
    super(message);
    this.name = 'AmapApiError';
    this.code = code;
    this.infocode = infocode;
  }
}

/** 高德配额 / 并发限制类错误码。 */
const QUOTA_INFOCODES = new Set([
  '10003',
  '10019',
  '10020',
  '10021',
  '10022',
  '10026',
  '10029',
  '10041',
  '10043',
  '10044',
  '10045',
]);

/** Key / 权限 / 域名白名单类错误码。 */
const AUTH_INFOCODES = new Set([
  '10001',
  '10002',
  '10005',
  '10006',
  '10007',
  '10008',
  '10009',
  '10010',
  '10011',
  '10012',
  '10013',
  '20000',
  '20001',
  '20002',
  '20003',
]);

function readText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join('');
  }
  return typeof value === 'string' ? value : '';
}

/** `"113.32,23.10"` → `[113.32, 23.10]`。 */
export function parseLocation(value: string | undefined): LngLat | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const [rawLng, rawLat] = value.split(',');
  const lng = Number(rawLng);
  const lat = Number(rawLat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

/** 解析 `lng,lat;lng,lat` 形式的折线。 */
function parsePolyline(value: string | undefined, fallback: LngLat[]): LngLat[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }
  const points = value
    .split(';')
    .map((pair) => parseLocation(pair))
    .filter((point): point is LngLat => point !== null);
  return points.length >= 2 ? points : fallback;
}

export function parsePlaces(response: AmapResponse): PlaceResult[] {
  const pois = Array.isArray(response.pois) ? response.pois : [];
  const results: PlaceResult[] = [];
  for (const poi of pois) {
    const location = parseLocation(poi.location);
    const name = readText(poi.name);
    if (location === null || name === '') {
      continue;
    }
    results.push({
      id: readText(poi.id) || `${name}-${location[0]}-${location[1]}`,
      name,
      address: readText(poi.address),
      city: readText(poi.cityname),
      district: readText(poi.adname),
      lng: location[0],
      lat: location[1],
      type: readText(poi.type),
    });
  }
  return results;
}

/** 解析路线第一方案的一段；没有折线时退回起终点直线。 */
export function parseRouteLeg(
  response: AmapResponse,
  origin: LngLat,
  destination: LngLat,
): { distanceMeters: number; durationSeconds: number; path: LngLat[] } {
  const path = response.route?.paths?.[0];
  if (path === undefined) {
    throw new AmapApiError('ROUTE_NOT_FOUND', '没有找到可用路线');
  }
  const fallback = [origin, destination];
  const points: LngLat[] = [];
  for (const step of path.steps ?? []) {
    for (const point of parsePolyline(step.polyline, [])) {
      points.push(point);
    }
  }
  const deduped = points.filter(
    (point, index) =>
      index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1],
  );
  return {
    distanceMeters: Number(path.distance ?? 0),
    durationSeconds: Number(path.duration ?? 0),
    path: deduped.length >= 2 ? deduped : fallback,
  };
}

export function parseGeocodeResults(response: AmapResponse, fallbackName: string): PlaceResult[] {
  const geocodes = Array.isArray(response.geocodes) ? response.geocodes : [];
  const results: PlaceResult[] = [];
  for (const geocode of geocodes) {
    const location = parseLocation(geocode.location);
    if (location === null) {
      continue;
    }
    const city = readText(geocode.city);
    const district = readText(geocode.district);
    results.push({
      id: `geo-${location[0]}-${location[1]}`,
      name: fallbackName,
      address: readText(geocode.formatted_address) || readText(geocode.province),
      city,
      district,
      lng: location[0],
      lat: location[1],
      type: 'geocode',
    });
  }
  return results;
}

async function requestAmap(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<AmapResponse> {
  const url = new URL(amapProxyUrl(path), window.location.origin);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(name, String(value));
    }
  });

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new AmapApiError('NETWORK', '无法连接高德服务，请检查网络后重试');
  }

  if (response.status === 503) {
    throw new AmapApiError('NOT_CONFIGURED', '后端尚未配置高德 Web 服务 Key');
  }

  let data: AmapResponse;
  try {
    data = (await response.json()) as AmapResponse;
  } catch {
    throw new AmapApiError('BAD_RESPONSE', '高德服务返回了无法识别的数据');
  }

  if (data.status !== '1') {
    const infocode = String(data.infocode ?? '');
    const info = data.info ?? '高德服务返回错误';
    if (QUOTA_INFOCODES.has(infocode)) {
      throw new AmapApiError('QUOTA', '高德 API 配额或并发限制已触发，请稍后再试', infocode);
    }
    if (AUTH_INFOCODES.has(infocode)) {
      throw new AmapApiError('AUTH', '高德 Key 或安全配置无效，请检查环境变量', infocode);
    }
    throw new AmapApiError('AMAP_ERROR', info, infocode);
  }
  return data;
}

/** 城市 / 景点 / 地址搜索（全国范围；传 city 时优先该城）。 */
export async function searchPlaces(keyword: string, city?: string): Promise<PlaceResult[]> {
  const keywords = keyword.trim();
  if (keywords === '') {
    return [];
  }
  const scopedCity = city?.trim() ?? '';
  const data = await requestAmap('v3/place/text', {
    keywords,
    city: scopedCity,
    citylimit: scopedCity === '' ? 'false' : 'true',
    offset: 10,
    page: 1,
    extensions: 'base',
  });
  return parsePlaces(data);
}

/** 地图点击后的附近景点（用于「点击地图点位加入途经点」）。 */
export async function aroundPlaces(lng: number, lat: number, radius = 300): Promise<PlaceResult[]> {
  const data = await requestAmap('v3/place/around', {
    location: `${lng},${lat}`,
    radius,
    offset: 5,
    page: 1,
    extensions: 'base',
    sortrule: 'distance',
  });
  return parsePlaces(data);
}

/** 名称 → 坐标：先用地点搜索，失败再走地理编码。 */
export async function geocodePlace(name: string, city?: string): Promise<PlaceResult | null> {
  const results = await searchPlaces(name, city);
  if (results.length > 0) {
    return results[0];
  }
  const data = await requestAmap('v3/geocode/geo', {
    address: name,
    city: city?.trim() ?? '',
  });
  return parseGeocodeResults(data, name)[0] ?? null;
}

const ROUTE_PATHS: Record<TravelMode, string> = {
  walking: 'v3/direction/walking',
  driving: 'v3/direction/driving',
  bicycling: 'v3/direction/bicycling',
};

function toLocation(point: RouteWaypoint): string {
  return `${point.lng},${point.lat}`;
}

/**
 * 逐段规划路线并按顺序拼成一条。高德步行/骑行对途经点支持不一致，逐段请求
 * 可以保证顺序、距离和时长口径一致；8 个途经点最多 7 次请求。
 */
export async function planRoute(mode: TravelMode, waypoints: RouteWaypoint[]): Promise<RoutePlan> {
  if (waypoints.length < 2) {
    throw new AmapApiError('INVALID_WAYPOINTS', '至少需要两个途经点才能规划路线');
  }

  let distanceMeters = 0;
  let durationSeconds = 0;
  const path: LngLat[] = [];
  const legs: RoutePlan['legs'] = [];

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const data = await requestAmap(ROUTE_PATHS[mode], {
      origin: toLocation(start),
      destination: toLocation(end),
      strategy: mode === 'driving' ? '0' : undefined,
    });
    const leg = parseRouteLeg(data, [start.lng, start.lat], [end.lng, end.lat]);
    distanceMeters += leg.distanceMeters;
    durationSeconds += leg.durationSeconds;
    legs.push({
      fromId: start.id,
      toId: end.id,
      distanceMeters: leg.distanceMeters,
      durationSeconds: leg.durationSeconds,
    });
    for (const point of leg.path) {
      const previous = path[path.length - 1];
      if (previous === undefined || previous[0] !== point[0] || previous[1] !== point[1]) {
        path.push(point);
      }
    }
  }

  return { mode, distanceMeters, durationSeconds, path, legs };
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} 米`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} 公里`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '—';
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分钟`;
}

/** 面向用户的高德错误文案（含配额 / Key / 网络 / 路线失败）。 */
export function amapErrorMessage(error: unknown): string {
  if (error instanceof AmapApiError) {
    switch (error.code) {
      case 'QUOTA':
        return '高德 API 配额或并发限制已触发，请稍后再试。';
      case 'AUTH':
        return '高德 Key 或安全配置无效，请检查前端 JS Key 与后端 Web 服务 Key。';
      case 'NOT_CONFIGURED':
      case 'MISSING_JS_KEY':
        return '高德地图尚未配置：请设置 VITE_AMAP_JS_KEY 与 AMAP_WEB_SERVICE_KEY。';
      case 'NETWORK':
        return '高德服务连接失败，请检查网络后重试。';
      case 'ROUTE_NOT_FOUND':
        return '没有找到可用路线，请调整途经点或出行方式。';
      case 'INVALID_WAYPOINTS':
        return '至少选择两个途经点后才能生成路线。';
      default:
        return `高德服务返回错误${error.infocode === '' ? '' : `（${error.infocode}）`}，请稍后重试。`;
    }
  }
  return '地图服务暂时不可用，请稍后重试。';
}