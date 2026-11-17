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
  return name.replace(/[\s·・（）()\-—,，。]/g, '').trim();
}

/** 名称是否指向同一地点（相同，或一方包含另一方，如「海心沙亚运公园」vs「海心沙」）。 */
function samePlace(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  if (a === '' || b === '') {
    return false;
  }
  if (a === b) {
    return true;
  }
  return a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a));
}

/**
 * 按当前路线筛选并排序同行者；无共同景点时不展示。
 * 同行者的共同景点沿用当前路线上的名称，保证与地图/列表一致。
 */
export function matchCompanions(
  routeNames: string[],
  companions: TravelCompanion[],
): CompanionMatch[] {
  return companions
    .map((companion) => {
      const matchedStops: string[] = [];
      for (const expected of companion.sharedStops) {
        const actual = routeNames.find((name) => samePlace(name, expected));
        if (actual !== undefined && !matchedStops.includes(actual)) {
          matchedStops.push(actual);
        }
      }
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