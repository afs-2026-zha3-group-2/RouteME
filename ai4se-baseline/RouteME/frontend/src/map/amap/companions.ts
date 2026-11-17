/**
 * 同行者匹配数据模型（Mock 数据与 UI 解耦）。
 *
 * 真实的路线重合度目前由数据模型的 overlapPercent 提供（Mock 阶段），页面只
 * 负责展示；同时用共同景点数对基础重合度做一次收窄，保证换路线后不会继续显示
 * 与当前路线无关的百分比。接入真实匹配服务时替换 mockCompanions 即可。
 */

export type TravelCompanion = {
  id: string;
  userId: number;
  tripId?: number;
  name: string;
  avatarInitial: string;
  bio: string;
  homeCity: string;
  age: number;
  dateRange: [string, string];
  preferences: string[];
  /** 数据模型给出的基础路线重合度（Mock 阶段）。 */
  overlapPercent: number;
  /** 该同行者路线与 RouteMe 示例路线共同的景点名称。 */
  sharedStops: string[];
  /** 同行者的完整路线（保留给真实匹配算法）。 */
  route: string[];
};

export type CompanionMatch = TravelCompanion & {
  /** 与当前路线真正共同的景点。 */
  matchedStops: string[];
  /** 按当前路线收窄后的展示百分比。 */
  percent: number;
};

function normalize(name: string): string {
  return name.replace(/\s+/g, '').trim();
}

/** 按当前路线筛选并排序同行者；无共同景点时不展示。 */
export function matchCompanions(
  routeNames: string[],
  companions: TravelCompanion[],
): CompanionMatch[] {
  const current = new Set(routeNames.map(normalize));
  return companions
    .map((companion) => {
      const matchedStops = companion.sharedStops.filter((stop) => current.has(normalize(stop)));
      const ratio =
        companion.sharedStops.length === 0 ? 0 : matchedStops.length / companion.sharedStops.length;
      return {
        ...companion,
        matchedStops,
        percent: Math.round(companion.overlapPercent * ratio),
      };
    })
    .filter((match) => match.matchedStops.length > 0 && match.percent > 0)
    .sort(
      (left, right) =>
        right.percent - left.percent || left.name.localeCompare(right.name, 'zh'),
    );
}

/** 侧边栏聚合口径：最高重合度 + 同行者人数。 */
export function topCompanionMatch(
  matches: CompanionMatch[],
): { percent: number; count: number } | null {
  if (matches.length === 0) {
    return null;
  }
  return { percent: matches[0].percent, count: matches.length };
}