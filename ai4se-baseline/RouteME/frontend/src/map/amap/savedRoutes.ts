/**
 * 已保存路线（本机 localStorage）。
 *
 * 保存口径按需求固定：POI ID、名称、经纬度、顺序、出行方式、日期、距离与预计
 * 时间全部进入数据模型；不依赖高德地图实例。接入后端路线接口时可把
 * saveRoute 换成 API 调用，页面无需改字段。
 */

import type { RoutePlan, RouteWaypoint, TravelMode } from './AmapService';

export type SavedRouteStop = {
  poiId: string;
  name: string;
  address?: string;
  lng: number;
  lat: number;
  order: number;
};

export type SavedRoute = {
  id: string;
  stops: SavedRouteStop[];
  mode: TravelMode;
  dateRange: { start: string; end: string };
  distanceMeters: number;
  durationSeconds: number;
  createdAt: string;
};

const STORAGE_KEY = 'routeme.savedRoutes';
const MAX_SAVED_ROUTES = 20;

/** 把当前页面状态转成可保存的路线快照（纯函数，便于测试）。 */
export function buildSavedRoute(
  waypoints: RouteWaypoint[],
  route: RoutePlan,
  dateRange: { start: string; end: string },
  now: Date = new Date(),
): SavedRoute {
  return {
    id: `route-${now.getTime()}`,
    stops: waypoints.map((waypoint, index) => ({
      poiId: waypoint.id,
      name: waypoint.name,
      address: waypoint.address,
      lng: waypoint.lng,
      lat: waypoint.lat,
      order: index + 1,
    })),
    mode: route.mode,
    dateRange,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    createdAt: now.toISOString(),
  };
}

function readAll(): SavedRoute[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === '') {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedRoute[]) : [];
  } catch {
    return [];
  }
}

/** 最近保存的在前，最多保留 20 条。 */
export function saveRoute(route: SavedRoute): SavedRoute[] {
  const next = [route, ...readAll()].slice(0, MAX_SAVED_ROUTES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function loadSavedRoutes(): SavedRoute[] {
  return readAll();
}