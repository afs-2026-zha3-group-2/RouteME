/**
 * 高德 JS API 2.0 服务封装（搜索 / 地理编码 / 步行、驾车、骑行、公交路线）。
 *
 * 本项目持有的是 **Web 端（JS API）Key**：REST 接口会返回 USERKEY_PLAT_NOMATCH，
 * 因此统一走 JS API 插件（AMap.PlaceSearch / Geocoder / Walking / Driving /
 * Riding / Transfer）。安全密钥 securityJsCode 只保存在后端，由 `/_AMapService` 代理补上
 * `jscode` 参数，浏览器产物里不出现密钥。
 *
 * 业务层只依赖本文件的 RouteMe 数据模型，不直接接触高德实例或原始字段；
 * 纯映射函数单独导出，便于在 Node 环境测试。
 */

import { amapConfig, amapServiceHost } from './config';
import { loadAmap } from './loader';
import {
  PLACES,
  findPlaceByName,
  placesInCity,
  searchPlaces as catalogSearchPlaces,
  type Place,
} from '../placeCatalog';
import type { LngLat } from './types';

export type TravelMode = 'walking' | 'driving' | 'bicycling' | 'transit';

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  lng: number;
  lat: number;
  type: string;
  /**
   * 离线地名库兜底出来的坐标：只用于演示排版，与真实地理位置可能相差数百米
   * 到数公里。UI 必须显式标注「示意位置」，不伪装成高德返回的精确坐标。
   */
  approximate?: boolean;
};

/** 附近搜索候选：在 PlaceResult 上补充与点击位置的距离。 */
export type NearbyPlace = PlaceResult & { distanceMeters: number };

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
  /** 高德路线不可用时按直线估算，UI 用虚线区分。 */
  estimated?: boolean;
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

export type SdkStep = { path?: SdkLngLat[] | string; polyline?: string };

export type SdkRoute = {
  distance?: number | string;
  time?: number | string;
  steps?: SdkStep[];
  /** 骑行（AMap.Riding）2.0 把分段放在 rides，而不是 steps。 */
  rides?: SdkStep[];
  transits?: SdkTransit[];
};

/** 公交换乘方案：SDK 2.0 规范化为 plans（path/time）；REST 原生折线分散在 walking / bus 分段。 */
export type SdkTransitSegment = {
  walking?: { steps?: SdkStep[] };
  bus?: { buslines?: Array<{ polyline?: string }> };
  /** SDK 2.0 规范化分段详情（含折线）。 */
  transit?: { path?: SdkLngLat[] };
};

export type SdkTransit = {
  distance?: number | string;
  /** REST 原生结构时长在顶层。 */
  duration?: number | string;
  /** SDK 2.0 规范化时长在 time；cost 为数值票价。 */
  time?: number | string;
  cost?: { duration?: number | string } | number | string;
  /** SDK 2.0 规范化：方案自带完整折线（AMap.LngLat[]）。 */
  path?: SdkLngLat[];
  segments?: SdkTransitSegment[];
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
  /** REST 原生结构（route.transits，直连代理 / 降级兼容）。 */
  route?: SdkRoute;
  /** SDK 2.0 Transfer 规范化结构（plans，真实回调交付）。 */
  plans?: SdkTransit[];
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
  getAddress(
    location: LngLat,
    callback: (status: string, result: SdkAddressResult) => void,
  ): void;
};

type SdkAddressResult = {
  info?: string;
  infocode?: string;
  regeocode?: { formattedAddress?: string };
};

type SdkCtor<T> = new (options?: Record<string, unknown>) => T;

type AmapSdk = {
  plugin(names: string[], callback?: () => void): void;
  PlaceSearch: SdkCtor<PlaceSearchLike>;
  Geocoder: SdkCtor<GeocoderLike>;
  Walking: SdkCtor<RouteServiceLike>;
  Driving: SdkCtor<RouteServiceLike>;
  Riding: SdkCtor<RouteServiceLike>;
  Transfer: SdkCtor<RouteServiceLike>;
};

/** 本文件用到的全部插件，一次加载。 */
const PLUGINS = [
  'AMap.PlaceSearch',
  'AMap.Geocoder',
  'AMap.Walking',
  'AMap.Driving',
  'AMap.Riding',
  'AMap.Transfer',
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
  | 'INVALID_WAYPOINTS'
  | 'PROXY_UNAVAILABLE'
  | 'UPSTREAM_UNAVAILABLE';

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

/** 追加 step 折线并去重：SDK 规范化为 path 对象数组，REST 原生为 polyline / path 字符串。 */
function appendStepPath(points: LngLat[], step: SdkStep): void {
  const push = (lng: number, lat: number) => {
    const previous = points[points.length - 1];
    if (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      (previous === undefined || previous[0] !== lng || previous[1] !== lat)
    ) {
      points.push([lng, lat]);
    }
  };
  const raw = step.path ?? step.polyline;
  if (typeof raw === 'string') {
    for (const pair of raw.split(';')) {
      const [lng, lat] = pair.split(',').map(Number);
      push(lng, lat);
    }
  } else {
    for (const point of raw ?? []) {
      push(point.getLng(), point.getLat());
    }
  }
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
  // 步行 / 驾车：steps；骑行（Riding 插件）：rides。两者都存在时按顺序拼接。
  for (const step of [...(route.steps ?? []), ...(route.rides ?? [])]) {
    appendStepPath(points, step);
  }
  return {
    distanceMeters: Number(route.distance ?? 0),
    durationSeconds: Number(route.time ?? 0),
    path: points.length >= 2 ? points : [origin, destination],
  };
}

/** 高德公交方案 → 一段行程：SDK 2.0 直接用 plan.path；REST 原生合并 walking / bus 分段折线；去重；无折线时退回直线。 */
export function parseTransitLeg(
  transit: SdkTransit | undefined,
  origin: LngLat,
  destination: LngLat,
): { distanceMeters: number; durationSeconds: number; path: LngLat[] } {
  if (transit === undefined) {
    throw new AmapApiError('ROUTE_NOT_FOUND', '没有找到可用路线');
  }
  const points: LngLat[] = [];
  const push = (lng: number, lat: number) => {
    const previous = points[points.length - 1];
    if (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      (previous === undefined || previous[0] !== lng || previous[1] !== lat)
    ) {
      points.push([lng, lat]);
    }
  };
  const pushPolyline = (polyline: string) => {
    for (const pair of polyline.split(';')) {
      const [lng, lat] = pair.split(',').map(Number);
      push(lng, lat);
    }
  };
  const pushPath = (path: SdkLngLat[]) => {
    for (const point of path) {
      push(point.getLng(), point.getLat());
    }
  };
  if (Array.isArray(transit.path) && transit.path.length > 0) {
    pushPath(transit.path);
  } else {
    for (const segment of transit.segments ?? []) {
      if (Array.isArray(segment.transit?.path) && segment.transit.path.length > 0) {
        pushPath(segment.transit.path);
        continue;
      }
      for (const step of segment.walking?.steps ?? []) {
        appendStepPath(points, step);
      }
      for (const busline of segment.bus?.buslines ?? []) {
        pushPolyline(busline.polyline ?? '');
      }
    }
  }
  // 时长：旧 SDK cost.duration → REST 原生顶层 duration → SDK 2.0 time；cost 可能是票价（数值 / 字符串）不可误读。
  const costDuration = typeof transit.cost === 'object' ? transit.cost?.duration : undefined;
  return {
    distanceMeters: Number(transit.distance ?? 0),
    durationSeconds: Number(costDuration ?? transit.duration ?? transit.time ?? 0),
    path: points.length >= 2 ? points : [origin, destination],
  };
}

/** 首个换乘方案：SDK 2.0 规范化 plans[0] 优先；兼容 routes[0].transits 与 REST 原生 route.transits。 */
export function firstTransit(result: SdkRouteResult | undefined): SdkTransit | undefined {
  return result?.plans?.[0] ?? result?.routes?.[0]?.transits?.[0] ?? result?.route?.transits?.[0];
}

/* ---------- 名称相关性（防止模糊匹配把地点定位到别处） ---------- */

/**
 * 名称归一化：去掉空白、标点、括号补充说明与常见行政后缀。
 *
 * <p>用于判断「搜索结果是不是用户要找的那个地点」，因此只保留对判断有意义的字。
 */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[（(][^)）]*[)）]/g, '')
    .replace(/[\s·・\-—_.,，。;；:：'"“”‘’/\\|]/g, '')
    .replace(/(特别行政区|自治区|自治州|自治县|街道|社区|景区|风景区)$/g, '')
    .trim();
}

/** 最长公共子串长度（地名都很短，直接 O(n·m) 比较）。 */
export function longestCommonSubstring(left: string, right: string): number {
  if (left === '' || right === '') {
    return 0;
  }
  let best = 0;
  const previous = new Array<number>(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = 0;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = previous[j];
      previous[j] = left[i - 1] === right[j - 1] ? diagonal + 1 : 0;
      diagonal = saved;
      if (previous[j] > best) {
        best = previous[j];
      }
    }
  }
  return best;
}

/**
 * 名称是否指向同一地点：归一化后相等，或一方是另一方的子串。
 *
 * <p>高德在「城市限定 + 关键词对不上」时会返回模糊匹配结果，例如在中山搜
 * 「淇澳岛」会回「淇澳服饰」（大涌镇，偏离 40 公里）。只共享前缀不算匹配，
 * 必须有包含关系，才能避免把同名前缀的商户当成景点。
 */
export function isRelevantName(keyword: string, name: string): boolean {
  const key = normalizeName(keyword);
  const target = normalizeName(name);
  if (key === '' || target === '') {
    return false;
  }
  if (key === target) {
    return true;
  }
  if (key.length < 2) {
    return false;
  }
  return target.includes(key) || key.includes(target);
}

/** 搜索结果是否相关：名称相关，或地址里出现关键词（支持按地址搜索）。 */
export function isRelevantPlace(keyword: string, place: PlaceResult): boolean {
  if (isRelevantName(keyword, place.name)) {
    return true;
  }
  const key = normalizeName(keyword);
  return key.length >= 2 && normalizeName(place.address).includes(key);
}

/** 相关性排序：完全一致 → 名称前缀 → 包含关系 → 名称更短（更具体）优先。 */
export function rankPlaces(keyword: string, places: PlaceResult[]): PlaceResult[] {
  const key = normalizeName(keyword);
  const score = (place: PlaceResult): number => {
    const name = normalizeName(place.name);
    if (name === key) {
      return 4;
    }
    if (name.startsWith(key)) {
      return 3;
    }
    if (name.includes(key) || key.includes(name)) {
      return 2;
    }
    return 1;
  };
  return [...places].sort(
    (left, right) => score(right) - score(left) || left.name.length - right.name.length,
  );
}

/**
 * 过滤掉高德返回的模糊匹配结果，并按相关性排序。
 *
 * <p>全部不相关时返回空数组：让 UI 显示「没有找到」，而不是把一个无关地点
 * 放到地图上造成很大的定位误差。
 */
export function filterRelevantPlaces(keyword: string, places: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  const relevant = places.filter((place) => {
    if (!isRelevantPlace(keyword, place)) {
      return false;
    }
    const key = place.id === '' ? `${place.name}@${place.lng},${place.lat}` : place.id;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return rankPlaces(keyword, relevant);
}

/* ---------- 离线地名库兜底 ---------- */

function normalizePlaceName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 限定在行程城市内的候选地名。
 *
 * <p>城市名解析不到时返回空数组：宁可少定位，也不把外地同名景点放到地图上。
 */
function catalogPool(city?: string): Place[] {
  const raw = city?.trim() ?? '';
  if (raw === '') {
    return PLACES;
  }
  const cityPlace = findPlaceByName(raw);
  if (cityPlace === undefined) {
    return [];
  }
  return placesInCity(cityPlace.kind === 'city' ? cityPlace.name : cityPlace.city);
}

/**
 * 名称 → 离线地名库条目。
 *
 * <p>先按名称/别名精确匹配；再退化为「行程文案包含地名」，例如
 * 「大鹏所城集合」命中「大鹏所城」、「东西涌穿越 12km」命中「东西涌」。
 * 多个候选时取最长的地名，避免短名抢先；城市节点本身不参与包含匹配。
 */
export function matchCatalogPlace(name: string, city?: string): Place | null {
  const value = normalizePlaceName(name);
  if (value === '') {
    return null;
  }
  const pool = catalogPool(city);
  if (pool.length === 0) {
    return null;
  }

  const exact = pool.find(
    (place) =>
      normalizePlaceName(place.name) === value ||
      place.aliases.some((alias) => normalizePlaceName(alias) === value),
  );
  if (exact !== undefined) {
    return exact;
  }

  let best: { place: Place; length: number } | null = null;
  for (const place of pool) {
    if (place.kind === 'city') {
      continue;
    }
    for (const candidate of [place.name, ...place.aliases]) {
      const needle = normalizePlaceName(candidate);
      if (needle.length < 2 || !value.includes(needle)) {
        continue;
      }
      if (best === null || needle.length > best.length) {
        best = { place, length: needle.length };
      }
    }
  }
  return best?.place ?? null;
}

/** 离线地名库 → RouteMe 地点（高德搜索/地理编码不可用时兜底）。 */
export function catalogPlaceResult(name: string, city?: string): PlaceResult | null {
  const place = matchCatalogPlace(name, city);
  return place === null ? null : placeToResult(place);
}

function placeToResult(place: Place): PlaceResult {
  return {
    id: place.id,
    name: place.name,
    // 离线条目没有街道地址；城市已由 city 字段展示，避免搜索面板重复出现。
    address: '',
    city: place.city,
    district: '',
    lng: place.lng,
    lat: place.lat,
    type: 'offline',
    // 手工布局城市（广州/北京/上海等）的经纬度由局部 viewBox 反推，属于示意坐标。
    approximate: true,
  };
}

/** 关键词 → 离线地名库结果（限定城市时只保留该城条目）。 */
function catalogSearchResults(keyword: string, city?: string): PlaceResult[] {
  const scoped = city?.trim() ?? '';
  const pool = scoped === '' ? PLACES : catalogPool(scoped);
  if (pool.length === 0) {
    return [];
  }
  const allowed = new Set(pool.map((place) => place.id));
  return catalogSearchPlaces(keyword, { kinds: ['city', 'poi'], limit: 50 })
    .filter((place) => allowed.has(place.id))
    .slice(0, 10)
    .map(placeToResult);
}

/* ---------- 直线兜底路线 ---------- */

/** 各出行方式的平均速度（米/秒），仅用于离线估算。 */
const MODE_SPEED_MPS: Record<TravelMode, number> = {
  walking: 1.2,
  bicycling: 4.2,
  driving: 8.3,
  transit: 5.5,
};

/** 两点间大圆距离（米）。 */
export function haversineMeters(from: LngLat, to: LngLat): number {
  const earthRadius = 6371008.8;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRad(to[0] - from[0]);
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * 直线兜底路线：保留途经点顺序，用球面距离与平均速度估算。
 *
 * <p>高德路线服务不可用（未配置安全密钥、代理不可达）时仍能画出行程顺序，
 * 调用方需要用 {@link RoutePlan.estimated} 向用户说明这是估算值。
 */
export function straightLineRoute(mode: TravelMode, waypoints: RouteWaypoint[]): RoutePlan {
  if (waypoints.length < 2) {
    throw new AmapApiError('INVALID_WAYPOINTS', '至少需要两个途经点才能规划路线');
  }
  const speed = MODE_SPEED_MPS[mode];
  const path: LngLat[] = waypoints.map((waypoint): LngLat => [waypoint.lng, waypoint.lat]);
  const legs: RoutePlan['legs'] = [];
  let distanceMeters = 0;
  let durationSeconds = 0;

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const legDistance = Math.round(haversineMeters([start.lng, start.lat], [end.lng, end.lat]));
    const legDuration = Math.round(legDistance / speed);
    distanceMeters += legDistance;
    durationSeconds += legDuration;
    legs.push({
      fromId: start.id,
      toId: end.id,
      distanceMeters: legDistance,
      durationSeconds: legDuration,
    });
  }

  return { mode, distanceMeters, durationSeconds, path, estimated: true, legs };
}

/** 高德 SDK 失败结果 → 统一错误（含配额 / Key / 安全密钥 / 代理）。 */
function sdkError(
  status: string,
  info: string | undefined,
  infocode: string | undefined,
): AmapApiError {
  const code = String(infocode ?? '');
  const message = info ?? '高德服务返回错误';
  const upper = message.toUpperCase();
  if (QUOTA_INFOCODES.has(code) || upper.includes('QPS') || upper.includes('LIMIT')) {
    return new AmapApiError('QUOTA', '高德 API 配额或并发限制已触发', code);
  }
  if (AUTH_INFOCODES.has(code) || upper.includes('SCODE')) {
    return new AmapApiError('AUTH', '高德 Key 或安全密钥无效', code || 'INVALID_USER_SCODE');
  }
  if (status === 'no_data') {
    return new AmapApiError('NO_RESULT', '没有找到结果', code);
  }
  // 本站代理自定义的错误码：区分「后端没配 Key」「转发失败」「路径被拒」。
  if (code === '50000' || upper.includes('AMAP_KEY_NOT_CONFIGURED')) {
    return new AmapApiError('NOT_CONFIGURED', '后端未配置高德 Key', code);
  }
  if (code === '50001' || upper.includes('AMAP_PROXY_UNAVAILABLE')) {
    return new AmapApiError('UPSTREAM_UNAVAILABLE', '高德上游转发失败', code || '50001');
  }
  return new AmapApiError('AMAP_ERROR', message, code);
}

/* ---------- 插件加载 ---------- */

/** 代理探测结果：ok / 后端未配置安全密钥 / Key 不可用 / 后端不可达。 */
export type ProxyProbeResult = 'ok' | 'not-configured' | 'key-invalid' | 'unavailable';

let probePending: Promise<ProxyProbeResult> | null = null;
/** 探测到的 Key 错误码（如 10009），供错误文案给用户可执行的理由。 */
let probeInfocode = '';

export function lastProbeInfocode(): string {
  return probeInfocode;
}

/**
 * 探测同源地图代理是否可用。
 *
 * <p>高德插件失败会统一回调 {@code status: 'error'}，无法区分「Key 错」与
 * 「后端没启动」。先探一次代理：502/504/网络错误说明后端不可达，503 说明后端
 * 缺少安全密钥，这样用户看到的是可操作的提示而不是笼统的「高德服务返回错误」。
 */
export async function probeProxy(): Promise<ProxyProbeResult> {
  if (typeof window === 'undefined') {
    return 'unavailable';
  }
  if (probePending !== null) {
    return probePending;
  }
  probePending = (async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(`${amapServiceHost()}/v3/ip`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (response.status === 503) {
        return 'not-configured';
      }
      if (!response.ok) {
        return 'unavailable';
      }
      // 代理返回 200 但高德拒绝了这个 Key（例如 Web 端 Key 被当成 Web 服务 Key
      // 使用，infocode 10009）：此时链路是通的，搜索/逆地理却一定失败，
      // 必须单独报出来，否则界面只能退回离线地名库并显示相差数公里的假精度。
      const body = (await response.json().catch(() => null)) as
        | { status?: string; info?: string; infocode?: string }
        | null;
      if (body?.info === 'AMAP_PROXY_UNAVAILABLE') {
        return 'unavailable';
      }
      if (body?.status === '0') {
        const info = body.info ?? '';
        const infocode = body.infocode ?? '';
        if (AUTH_INFOCODES.has(infocode) || AUTH_INFOCODES.has(info)) {
          probeInfocode = infocode !== '' ? infocode : info;
          return 'key-invalid';
        }
        // 其余业务错误（如配额）说明管道与 Key 都是通的。
        return 'ok';
      }
      return 'ok';
    } catch {
      return 'unavailable';
    } finally {
      window.clearTimeout(timer);
    }
  })();
  return probePending;
}

/** 允许「重新加载地图」后再次探测（例如刚启动后端）。 */
export function resetProxyProbe(): void {
  probePending = null;
  probeInfocode = '';
  sdkPending = null;
}

let sdkPending: Promise<AmapSdk> | null = null;

function loadSdk(): Promise<AmapSdk> {
  if (sdkPending !== null) {
    return sdkPending;
  }
  sdkPending = (async () => {
    // 代理探测是浏览器-only 诊断；非浏览器环境（单测替身）直接交给 loader。
    if (typeof window !== 'undefined') {
      const probe = await probeProxy();
      if (probe === 'unavailable') {
        throw new AmapApiError(
          'PROXY_UNAVAILABLE',
          '地图代理不可达（后端未启动）',
          'PROXY_UNAVAILABLE',
        );
      }
      if (probe === 'not-configured') {
        throw new AmapApiError(
          'NOT_CONFIGURED',
          '后端未配置高德安全密钥',
          'AMAP_KEY_NOT_CONFIGURED',
        );
      }
      if (probe === 'key-invalid') {
        throw new AmapApiError(
          'AUTH',
          '高德 Key 平台类型不匹配或安全密钥无效',
          lastProbeInfocode(),
        );
      }
    }
    const namespace = await loadAmap();
    const sdk = namespace as unknown as AmapSdk;
    if (typeof sdk.plugin !== 'function') {
      throw new AmapApiError('AMAP_ERROR', '高德插件加载器不可用');
    }
    return await new Promise<AmapSdk>((resolve) => {
      sdk.plugin(PLUGINS, () => resolve(sdk));
    });
  })().catch((error: unknown) => {
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
  try {
    const remote = await remoteSearchPlaces(keywords, city);
    const relevant = filterRelevantPlaces(keywords, remote);
    // 高德有结果但没有一条与关键词相关时按「没有找到」处理：
    // 这类模糊匹配（如中山搜淇澳岛 → 淇澳服饰）会把地点定位到几十公里外。
    if (remote.length > 0 && relevant.length === 0) {
      return [];
    }
    return relevant;
  } catch {
    // 高德不可用（未配置安全密钥 / 代理不可达）时退回离线地名库。
    return catalogSearchResults(keywords, city);
  }
}

async function remoteSearchPlaces(keywords: string, city?: string): Promise<PlaceResult[]> {
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

/**
 * 地图点击后的附近景点（用于「点击地图点位加入途经点」）。
 *
 * <p>高德不可用时返回空数组，**不再**用离线地名库凑数：那里的经纬度是手工
 * 布局反推的示意坐标，当作「附近地点」推荐会把用户点在 A 处的地点加到几公里
 * 外的 B 处。调用方应当回落到「点击点本身」这一精确来源。
 */
export async function aroundPlaces(
  lng: number,
  lat: number,
  radius = 500,
): Promise<NearbyPlace[]> {
  try {
    const remote = await remoteAroundPlaces(lng, lat, radius);
    return sortByDistance(remote, lng, lat).filter((place) => place.distanceMeters <= radius);
  } catch {
    return [];
  }
}

/** 把候选地点按与给定点的距离排序（高德 nearby 结果不保证按距离返回）。 */
export function sortByDistance(
  places: PlaceResult[],
  lng: number,
  lat: number,
): NearbyPlace[] {
  return places
    .map((place) => ({
      ...place,
      distanceMeters: Math.round(haversineMeters([lng, lat], [place.lng, place.lat])),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}

/**
 * 去掉挤在一起的重复条目（同名景点常有「A 区 / 登塔大厅 / 观景平台」等子点）。
 *
 * <p>按传入顺序保留，任一已保留条目的距离小于 `minMeters` 时丢弃后者；这样
 * 地图图钉不会叠成一团，也不会把同一个景点标出七八次。
 */
export function dedupeNearby(places: NearbyPlace[], minMeters = 150): NearbyPlace[] {
  const kept: NearbyPlace[] = [];
  for (const place of places) {
    const tooClose = kept.some(
      (existing) => haversineMeters([existing.lng, existing.lat], [place.lng, place.lat]) < minMeters,
    );
    if (!tooClose) {
      kept.push(place);
    }
  }
  return kept;
}

/**
 * 附近景点（风景名胜），用于地图上的景点图钉层。
 *
 * <p>有城市名时走高德「城市 + 风景名胜分类」全城检索：结果分布在整个城市，
 * 图钉才铺得开；没有城市名时退回点击点附近检索。失败返回空数组，不影响选点与路线。
 */
export async function scenicSpots(
  lng: number,
  lat: number,
  city?: string,
  limit = 10,
): Promise<NearbyPlace[]> {
  const scoped = (city ?? '').trim();
  try {
    const remote =
      scoped === '' || scoped === '中国'
        ? await remoteScenicSpots(lng, lat, 12000)
        : await remoteScenicSpotsByCity(scoped);
    // 1100 米间隔：同名景点常有「A 区 / 观景平台」等子点，靠太近会叠成一团。
    return dedupeNearby(sortByDistance(remote, lng, lat), 1100).slice(0, limit);
  } catch {
    return [];
  }
}

/** REST POI（v3/place/text）字段与 SDK 不同：location 是 "lng,lat" 字符串。 */
type RestPoi = {
  id?: string;
  name?: string;
  address?: string | string[];
  cityname?: string | string[];
  adname?: string | string[];
  location?: string;
  type?: string;
};

function restPoiToResult(poi: RestPoi): PlaceResult | null {
  const name = readText(poi.name);
  const [lng, lat] = String(poi.location ?? '').split(',').map(Number);
  if (name === '' || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }
  return {
    id: readText(poi.id) === '' ? `scenic-${lng},${lat}` : readText(poi.id),
    name,
    address: readText(poi.address),
    city: readText(poi.cityname),
    district: readText(poi.adname),
    lng,
    lat,
    type: readText(poi.type),
  };
}

/** 全城景点检索：经同源代理请求 v3/place/text（分类 = 风景名胜）。 */
async function remoteScenicSpotsByCity(city: string): Promise<PlaceResult[]> {
  const base = amapConfig.proxyPath;
  // 直连模式（proxyPath=off）拿不到 web 服务接口，交给附近检索兜底。
  if (base === 'off' || typeof fetch !== 'function') {
    return [];
  }
  const pages = [1, 2];
  const results = await Promise.all(
    pages.map(async (page) => {
      const query = new URLSearchParams({
        types: '风景名胜',
        city,
        citylimit: 'true',
        offset: '20',
        page: String(page),
        extensions: 'base',
      });
      const response = await fetch(`${base}/v3/place/text?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return [] as PlaceResult[];
      }
      const body = (await response.json().catch(() => null)) as
        | { status?: string; pois?: RestPoi[] | string }
        | null;
      if (body?.status !== '1' || !Array.isArray(body.pois)) {
        return [] as PlaceResult[];
      }
      return body.pois
        .map(restPoiToResult)
        .filter((place): place is PlaceResult => place !== null);
    }),
  );
  return results.flat();
}

async function remoteScenicSpots(
  lng: number,
  lat: number,
  radius: number,
): Promise<PlaceResult[]> {
  const sdk = await loadSdk();
  // type 走高德 POI 分类（风景名胜），比关键词「景点」更准。
  // 单页 20 条几乎都挤在同一片街区，多取 2 页再按距离去重，图钉才铺得开。
  const searchPage = (pageIndex: number) =>
    new Promise<PlaceResult[]>((resolve, reject) => {
      const service = new sdk.PlaceSearch({
        type: '风景名胜',
        pageSize: 20,
        pageIndex,
        extensions: 'base',
      });
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

  const pages = await Promise.all([searchPage(1), searchPage(2), searchPage(3)]);
  return pages.flat();
}

/**
 * 逆地理编码：把「用户点在地图上的点」变成可读名称。
 *
 * <p>坐标始终等于点击位置，只借地址生成名称——这样「点哪儿就是哪儿」，不会像
 * 取附近 POI 那样把途经点挪到别的地方。
 */
export async function reverseGeocode(lng: number, lat: number): Promise<PlaceResult> {
  const fallback: PlaceResult = {
    id: `point-${lng.toFixed(6)},${lat.toFixed(6)}`,
    name: `地图选点 ${lng.toFixed(5)}, ${lat.toFixed(5)}`,
    address: '',
    city: '',
    district: '',
    lng,
    lat,
    type: 'point',
  };
  try {
    const sdk = await loadSdk();
    const geocoder = new sdk.Geocoder({ radius: 200, extensions: 'base' });
    const named = await new Promise<PlaceResult | null>((resolve) => {
      geocoder.getAddress([lng, lat], (status, result) => {
        if (status !== 'complete') {
          resolve(null);
          return;
        }
        const geocode = result?.regeocode;
        const address = geocode?.formattedAddress ?? '';
        if (address === '') {
          resolve(null);
          return;
        }
        const point = pickRegeocodeName(address);
        resolve({
          ...fallback,
          name: point === '' ? fallback.name : point,
          address,
          // 行政区划字段缺失时保留空串，避免伪造城市。
          city: '',
          district: '',
        });
      });
    });
    return named ?? fallback;
  } catch {
    return fallback;
  }
}

/** 从逆地理地址里取一个短名：取最后一个行政区划之后的部分。 */
export function pickRegeocodeName(address: string): string {
  const trimmed = address.trim();
  if (trimmed === '') {
    return '';
  }
  // 「社区 / 小区 / 园区」里的「区」不是行政区划分隔符，先临时保护再还原。
  const protectedAddress = trimmed.replace(/(社区|小区|园区|景区|街区|校区)/g, (unit) =>
    unit.replace('区', '\u0001'),
  );
  const tail = protectedAddress.replace(/^.*[省市县区镇乡]/, '').replace(/\u0001/g, '区');
  const name = tail.length >= 2 ? tail : trimmed;
  // 「广东省珠海市香洲区唐家湾镇淇澳社区」→「淇澳社区」；
  // 「珠海市香洲区情侣中路」→「情侣中路」。
  return name.slice(0, 24);
}

async function remoteAroundPlaces(
  lng: number,
  lat: number,
  radius: number,
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

/**
 * 名称 → 坐标：先用高德地点搜索，失败再走地理编码，最后兜底离线地名库。
 *
 * <p>高德服务未配置或不可达时（本仓库的默认开发环境），城市与 Demo 途经点
 * 仍能通过 `map/data` 的离线索引定位，地图不至于整块空白。
 */
export async function geocodePlace(name: string, city?: string): Promise<PlaceResult | null> {
  const value = name.trim();
  if (value === '') {
    return null;
  }
  const remote = await remoteGeocode(value, city).catch(() => null);
  return remote ?? catalogPlaceResult(value, city);
}

async function remoteGeocode(value: string, city?: string): Promise<PlaceResult | null> {
  // searchPlaces 已做相关性过滤：模糊命中的无关地点不会进入候选。
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
      // 地理编码可能把不知道的地址解析到无关位置；只有地址与输入共享足够长的
      // 片段时才采用，否则宁可不定位，也不把 Marker 放到错误的城市。
      const address = geocode.formattedAddress ?? readText(geocode.province);
      const required = Math.min(3, normalizeName(value).length);
      if (required > 0 && longestCommonSubstring(normalizeName(value), normalizeName(address)) < required) {
        resolve(null);
        return;
      }
      const lng = location.getLng();
      const lat = location.getLat();
      resolve({
        id: `geo-${lng}-${lat}`,
        name: value,
        address,
        city: readText(geocode.city),
        district: readText(geocode.district),
        lng,
        lat,
        type: 'geocode',
      });
    });
  });
}

const ROUTE_SERVICES: Record<TravelMode, 'Walking' | 'Driving' | 'Riding' | 'Transfer'> = {
  walking: 'Walking',
  driving: 'Driving',
  bicycling: 'Riding',
  transit: 'Transfer',
};

/**
 * 逐段规划路线并按顺序拼成一条。高德路线插件对途经点支持不一致，逐段请求
 * 可以保证顺序、距离和时长口径一致；8 个途经点最多 7 次请求。
 * transit 需要目的地城市名（city）限定换乘搜索范围。
 */
export async function planRoute(
  mode: TravelMode,
  waypoints: RouteWaypoint[],
  city?: string,
): Promise<RoutePlan> {
  if (waypoints.length < 2) {
    throw new AmapApiError('INVALID_WAYPOINTS', '至少需要两个途经点才能规划路线');
  }
  const sdk = await loadSdk();
  const Service = sdk[ROUTE_SERVICES[mode]];
  const service =
    mode === 'transit'
      ? new Service({ city: city?.trim() ?? '', policy: 0, extensions: 'all' })
      : new Service(mode === 'driving' ? { policy: 0, extensions: 'base' } : {});

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
          resolve(
            mode === 'transit'
              ? parseTransitLeg(firstTransit(result), origin, destination)
              : toRouteLeg(result?.routes?.[0], origin, destination),
          );
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
        if (error.infocode === '10009') {
          return (
            '高德拒绝了这次请求（10009 平台不匹配）：Key 需为「Web端(JS API)」，' +
            '且代理要带上 s=rsv3 与安全密钥；请检查后端 web-service-key / security-js-code。'
          );
        }
        if (error.infocode === '10008') {
          return '高德安全密钥与 Key 不配对（10008）：请检查后端 security-js-code 是否属于同一个应用。';
        }
        if (error.infocode === '10001' || error.infocode === '10002') {
          return '高德 Key 无效或已过期：请检查前端 VITE_AMAP_JS_KEY 与后端 web-service-key。';
        }
        if (error.infocode.includes('SCODE')) {
          return '高德安全密钥 jscode 与 JS Key 不配对：请检查后端 security-js-code。';
        }
        return '高德 Key 或安全密钥无效：请检查 VITE_AMAP_JS_KEY 与后端 AMAP_SECURITY_JS_CODE。';
      case 'NOT_CONFIGURED':
      case 'MISSING_JS_KEY':
        return '高德地图尚未配置：请设置 VITE_AMAP_JS_KEY 与后端高德安全密钥。';
      case 'PROXY_UNAVAILABLE':
        return '地图代理不可达：请确认后端已启动（默认 8080），然后重新加载地图。';
      case 'UPSTREAM_UNAVAILABLE':
        return '高德上游暂时连不上（代理转发失败），请稍后重试。';
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