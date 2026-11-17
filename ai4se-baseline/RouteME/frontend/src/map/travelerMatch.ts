/**
 * 同行者匹配纯函数（refine-trip-map R2 / design D17）。
 *
 * 重合度＝共同景点数 ÷ 当前路线景点数（四舍五入百分比），完全由数据模型
 * （城市 travelers 的路线景点集合）计算；UI 组件 MUST NOT 硬编码百分比。
 */

import type { Traveler } from './data/types';

/** 共同景点（按当前路线顺序去重）。 */
export function sharedPois(route: string[], travelerRoute: string[]): string[] {
  const travelerSet = new Set(travelerRoute);
  const seen = new Set<string>();
  const shared: string[] = [];
  for (const poiId of route) {
    if (travelerSet.has(poiId) && !seen.has(poiId)) {
      seen.add(poiId);
      shared.push(poiId);
    }
  }
  return shared;
}

/** 路线重合度百分比；空路线返回 0（不除零）。 */
export function overlapPercent(route: string[], travelerRoute: string[]): number {
  if (route.length === 0) {
    return 0;
  }
  return Math.round((sharedPois(route, travelerRoute).length / route.length) * 100);
}

export type TravelerMatch = {
  traveler: Traveler;
  percent: number;
  shared: string[];
};

/** 过滤重合度 >0 的旅行者，按重合度降序（同分按姓名稳定排序）。 */
export function matchTravelers(route: string[], travelers: Traveler[]): TravelerMatch[] {
  return travelers
    .map((traveler) => ({
      traveler,
      percent: overlapPercent(route, traveler.route),
      shared: sharedPois(route, traveler.route),
    }))
    .filter((match) => match.percent > 0)
    .sort((left, right) => right.percent - left.percent || left.traveler.name.localeCompare(right.traveler.name, 'zh'));
}

/** 聚合气泡口径：最高重合度＋人数；无匹配返回 null。 */
export function topMatch(matches: TravelerMatch[]): { percent: number; count: number } | null {
  if (matches.length === 0) {
    return null;
  }
  return { percent: matches[0].percent, count: matches.length };
}