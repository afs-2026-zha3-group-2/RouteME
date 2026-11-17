/**
 * 路线「预计」估算纯函数（refine-trip-map R2 / design D17）。
 *
 * 离线无真实 Routing：距离＝相邻景点直线距离之和（城市局部坐标×公里标定），
 * 时间＝距离 ÷ 4.5km/h 步行速度。展示 MUST 标「预计」，不伪装真实导航结果。
 */

import type { Point } from './data/types';

export type RouteEstimate = {
  km: number;
  minutes: number;
};

export const WALK_KM_PER_HOUR = 4.5;

export function estimateRoute(points: Point[], kmPerX: number, kmPerY: number): RouteEstimate {
  let km = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    km += Math.hypot((to.x - from.x) * kmPerX, (to.y - from.y) * kmPerY);
  }
  return { km, minutes: (km / WALK_KM_PER_HOUR) * 60 };
}

/** 距离文案（不含「预计」前缀，由 UI 统一加）：≥1 取整，<1 一位小数。 */
export function formatEstimateKm(km: number): string {
  return km >= 1 ? String(Math.round(km)) : km.toFixed(1);
}

/** 时长文案：≥60 分钟用「x 小时 y 分钟」，否则「x 分钟」。 */
export function formatEstimateMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) {
    return `${Math.max(rounded, 1)} 分钟`;
  }
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分钟`;
}