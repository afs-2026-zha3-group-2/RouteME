/**
 * 高德 JS API 2.0 服务封装（搜索 / 地理编码 / 步行、驾车、骑行路线）。
 *
 * 本项目持有的是 **Web 端（JS API）Key**：REST 接口会返回 USERKEY_PLAT_NOMATCH，
 * 因此统一走 JS API 插件（AMap.PlaceSearch / Geocoder / Walking / Driving /
 * Riding）。安全密钥 securityJsCode 只保存在后端，由 `/_AMapService` 代理补上
 * `jscode` 参数，浏览器产物里不出现密钥。
 *
 * 业务层只依赖本文件的 RouteMe 数据模型，不直接接触高德实例或原始字段；
 * 纯映射函数单独导出，便于在 Node 环境测试。
 */

import { loadAmap } from './loader';
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

/* ---------- 高德插件的最小类型 ---------- */

type SdkLngLat = { getLng(): number; getLat(): number };

export type SdkPoi = {
  id?: string;
  name?: string;
  address?: string | string[];
  cityname?: string | string[];
  adname?: string | string[];
  type?: string;
  location?: SdkLngLat;
};

export type SdkStep = { path?: SdkLngLat[] };

export type SdkRoute = {
  distance?: number | string;
  time?: number | string;
  steps?: SdkStep[];
};

type SdkSearchResult = {
  info?: string;
  infocode?: string;
  poiList?: { pois?: SdkPoi[] };
};

type SdkRouteResult = {
  info?: string;
  infocode?: string;
  routes?: SdkRoute[];
};

type SdkGeocode = {
  location?: SdkLngLat;
  formattedAddress?: string;
  province?: string | string[];
  city?: string | string[];
  district?: string | string[];
};

type SdkGeocodeResult = {
  info?: string;
  infocode?: string;
  geocodes?: SdkGeocode[];
};

type PlaceSearchLike = {
  search(keyword: string, callback: (status: string, result: SdkSearchResult) => void): void;
  searchNearBy(
    keyword: string,
    center: LngLat,
    radius: number,
    callback: (status: string, result: SdkSearchResult) => void,
  ): void;
};

type RouteServiceLike = {
  search(
    origin: LngLat,
    destination: LngLat,
    callback: (status: string, result: SdkRouteResult) => void,
  ): void;
};

type GeocoderLike = {
  getLocation(address: string, callback: (status: string, result: SdkGeocodeResult) => void): void;
};

type SdkCtor<T> = new (options?: Record<string, unknown>) => T;

type AmapSdk = {
  plugin(names: string[], callback?: () => void): void;
  PlaceSearch: SdkCtor<PlaceSearchLike>;
  Geocoder: SdkCtor<GeocoderLike>;
  Walking: SdkCtor<RouteServiceLike>;
  Driving: SdkCtor<RouteServiceLike>;
  Riding: SdkCtor<RouteServiceLike>;
};

/** 本文件用到的全部插件，一次加载。 */
const PLUGINS = [
  'AMap.PlaceSearch',
  'AMap.Geocoder',
  'AMap.Walking',
  'AMap.Driving',
  'AMap.Riding',
];

export type AmapErrorCode =
  | 'NOT_CONFIGURED'
  | 'MISSING_JS_KEY'
  | 'NETWORK'
  | 'AUTH'
  | 'QUOTA'
  | 'AMAP_ERROR'
  | 'NO_RESULT'
  | 'ROUTE_NOT_FOUND'
  | 'INVALID_WAYPOINTS';

/** 高德错误统一包装，UI 只读取 code/infocode，不解析原始结果对象。 */
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

/** Key / 权限 / 域名白名单 / 安全密钥类错误码。 */
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
  'INVALID_USER_SCODE',
]);

function readText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join('');
  }
  return typeof value === 'string' ? value : '';
}

/* ---------- 纯映射函数（可单测） ---------- */

/** 高德 POI → RouteMe 地点；缺少名称或坐标时返回 null。 */
export function toPlaceResult(poi: SdkPoi): PlaceResult | null {
  const name = readText(poi.name);
  const location = poi.location;
  if (name === '' || location === undefined) {
    return null;
  }
  const lng = location.getLng();
  const lat = location.getLat();
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }
  return {
    id: readText(poi.id) || `${name}-${lng}-${lat}`,
    name,
    address: readText(poi.address),
    city: readText(poi.cityname),
    district: readText(poi.adname),
    lng,
    lat,
    type: readText(poi.type),
  };
}

/** 高德路线方案 → 一段行程：合并 step 折线并去重；没有折线时退回直线。 */
export function toRouteLeg(
  route: SdkRoute | undefined,
  origin: LngLat,
  destination: LngLat,
): { distanceMeters: number; durationSeconds: number; path: LngLat[] } {
  if (route === undefined) {
    throw new AmapApiError('ROUTE_NOT_FOUND', '没有找到可用路线');
  }
  const points: LngLat[] = [];
  for (const step of route.steps ?? []) {
    for (const point of step.path ?? []) {
      const lng = point.getLng();
      const lat = point.getLat();
      const previous = points[points.length - 1];
      if (
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        (previous === undefined || previous[0] !== lng || previous[1] !== lat)
      ) {
        points.push([lng, lat]);
      }
    }
  }
  return {
    distanceMeters: Number(route.distance ?? 0),
    durationSeconds: Number(route.time ?? 0),
    path: points.length >= 2 ? points : [origin, destination],
  };
}

/** 高德 SDK 失败结果 → 统一错误（含配额 / Key / 安全密钥）。 */
function sdkError(
  status: string,
  info: string | undefined,
  infocode: string | undefined,
): AmapApiError {
  const code = String(infocode ?? '');
  const message = info ?? '高德服务返回错误';
  if (QUOTA_INFOCODES.has(code)) {
    return new AmapApiError('QUOTA', '高德 API 配额或并发限制已触发', code);
  }
  if (AUTH_INFOCODES.has(code) || message.toUpperCase().includes('SCODE')) {
    return new AmapApiError('AUTH', '高德 Key 或安全密钥无效', code || 'INVALID_USER_SCODE');
  }
  if (status === 'no_data') {
    return new AmapApiError('NO_RESULT', '没有找到结果', code);
  }
  return new AmapApiError('AMAP_ERROR', message, code);
}

/* ---------- 插件加载 ---------- */

let sdkPending: Promise<AmapSdk> | null = null;

function loadSdk(): Promise<AmapSdk> {
  if (sdkPending !== null) {
    return sdkPending;
  }
  sdkPending = loadAmap()
    .then(
      (namespace) =>
        new Promise<AmapSdk>((resolve, reject) => {
          const sdk = namespace as unknown as AmapSdk;
          if (typeof sdk.plugin !== 'function') {
            reject(new AmapApiError('AMAP_ERROR', '高德插件加载器不可用'));
            return;
          }
          sdk.plugin(PLUGINS, () => resolve(sdk));
        }),
    )
    .catch((error: unknown) => {
      sdkPending = null;
      if (error instanceof AmapApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : '高德地图加载失败';
      throw new AmapApiError('NOT_CONFIGURED', message);
    });
  return sdkPending;
}

/* ---------- 对外服务 ---------- */

/** 城市 / 景点 / 地址搜索（传 city 时限定在该城）。 */
export async function searchPlaces(keyword: string, city?: string): Promise<PlaceResult[]> {
  const keywords = keyword.trim();
  if (keywords === '') {
    return [];
  }
  const sdk = await loadSdk();
  const scopedCity = city?.trim() ?? '';
  const service = new sdk.PlaceSearch({
    city: scopedCity,
    citylimit: scopedCity !== '',
    pageSize: 10,
    pageIndex: 1,
    extensions: 'base',
  });

  return new Promise<PlaceResult[]>((resolve, reject) => {
    service.search(keywords, (status, result) => {
      if (status === 'no_data') {
        resolve([]);
        return;
      }
      if (status !== 'complete') {
        reject(sdkError(status, result?.info, result?.infocode));
        return;
      }
      const pois = result?.poiList?.pois ?? [];
      resolve(pois.map(toPlaceResult).filter((place): place is PlaceResult => place !== null));
    });
  });
}

/** 地图点击后的附近景点（用于「点击地图点位加入途经点」）。 */
export async function aroundPlaces(
  lng: number,
  lat: number,
  radius = 500,
): Promise<PlaceResult[]> {
  const sdk = await loadSdk();
  const service = new sdk.PlaceSearch({ pageSize: 5, pageIndex: 1, extensions: 'base' });

  return new Promise<PlaceResult[]>((resolve, reject) => {
    service.searchNearBy('', [lng, lat], radius, (status, result) => {
      if (status === 'no_data') {
        resolve([]);
        return;
      }
      if (status !== 'complete') {
        reject(sdkError(status, result?.info, result?.infocode));
        return;
      }
      const pois = result?.poiList?.pois ?? [];
      resolve(pois.map(toPlaceResult).filter((place): place is PlaceResult => place !== null));
    });
  });
}

/** 名称 → 坐标：先用地点搜索，失败再走地理编码。 */
export async function geocodePlace(name: string, city?: string): Promise<PlaceResult | null> {
  const value = name.trim();
  if (value === '') {
    return null;
  }
  const found = await searchPlaces(value, city).catch(() => [] as PlaceResult[]);
  if (found.length > 0) {
    return found[0];
  }

  const sdk = await loadSdk();
  const geocoder = new sdk.Geocoder({ city: city?.trim() ?? '' });
  return new Promise<PlaceResult | null>((resolve, reject) => {
    geocoder.getLocation(value, (status, result) => {
      if (status === 'no_data') {
        resolve(null);
        return;
      }
      if (status !== 'complete') {
        reject(sdkError(status, result?.info, result?.infocode));
        return;
      }
      const geocode = result?.geocodes?.[0];
      const location = geocode?.location;
      if (geocode === undefined || location === undefined) {
        resolve(null);
        return;
      }
      const lng = location.getLng();
      const lat = location.getLat();
      resolve({
        id: `geo-${lng}-${lat}`,
        name: value,
        address: geocode.formattedAddress ?? readText(geocode.province),
        city: readText(geocode.city),
        district: readText(geocode.district),
        lng,
        lat,
        type: 'geocode',
      });
    });
  });
}

const ROUTE_SERVICES: Record<TravelMode, 'Walking' | 'Driving' | 'Riding'> = {
  walking: 'Walking',
  driving: 'Driving',
  bicycling: 'Riding',
};

/**
 * 逐段规划路线并按顺序拼成一条。高德路线插件对途经点支持不一致，逐段请求
 * 可以保证顺序、距离和时长口径一致；8 个途经点最多 7 次请求。
 */
export async function planRoute(mode: TravelMode, waypoints: RouteWaypoint[]): Promise<RoutePlan> {
  if (waypoints.length < 2) {
    throw new AmapApiError('INVALID_WAYPOINTS', '至少需要两个途经点才能规划路线');
  }
  const sdk = await loadSdk();
  const Service = sdk[ROUTE_SERVICES[mode]];
  const service = new Service(mode === 'driving' ? { policy: 0, extensions: 'base' } : {});

  let distanceMeters = 0;
  let durationSeconds = 0;
  const path: LngLat[] = [];
  const legs: RoutePlan['legs'] = [];

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const origin: LngLat = [start.lng, start.lat];
    const destination: LngLat = [end.lng, end.lat];

    const leg = await new Promise<ReturnType<typeof toRouteLeg>>((resolve, reject) => {
      service.search(origin, destination, (status, result) => {
        if (status === 'no_data') {
          reject(new AmapApiError('ROUTE_NOT_FOUND', '没有找到可用路线'));
          return;
        }
        if (status !== 'complete') {
          reject(sdkError(status, result?.info, result?.infocode));
          return;
        }
        try {
          resolve(toRouteLeg(result?.routes?.[0], origin, destination));
        } catch (error: unknown) {
          reject(error instanceof Error ? error : new AmapApiError('ROUTE_NOT_FOUND', '没有找到可用路线'));
        }
      });
    });

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
        return '高德 Key 或安全密钥无效：请检查 VITE_AMAP_JS_KEY 与后端 AMAP_SECURITY_JS_CODE。';
      case 'NOT_CONFIGURED':
      case 'MISSING_JS_KEY':
        return '高德地图尚未配置：请设置 VITE_AMAP_JS_KEY 与后端高德安全密钥。';
      case 'NETWORK':
        return '高德服务连接失败，请检查网络后重试。';
      case 'NO_RESULT':
        return '没有找到相关地点，换个关键词试试。';
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