import { profileMessages } from '../i18n/profileMessages';
import { tripMessages } from '../i18n/tripMessages';
import type { UserGrowth } from '../types';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

function normalizeLevel(level: number | null | undefined): number {
  if (typeof level !== 'number' || !Number.isFinite(level)) {
    return MIN_LEVEL;
  }
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(level)));
}

/** 等级标签：只输出 `LVn`，契约外按边界兜底，不出现 LV6。 */
export function levelLabel(level: number | null | undefined): string {
  return `LV${normalizeLevel(level)}`;
}

/** LV5 或服务端满级标记；等级与经验由服务端派生，前端不重复计算。 */
export function isMaxLevel(level: number | null | undefined, maxLevel?: boolean | null): boolean {
  return maxLevel === true || normalizeLevel(level) === MAX_LEVEL;
}

export type GrowthProgress = {
  percent: number;
  counter: string;
  hint: string;
};

/**
 * 本人进度：当前经验与距下一级所需经验都来自服务端；
 * 他人响应不含经验，返回 null，由调用方只渲染徽标。
 */
export function expProgress(growth: UserGrowth | null | undefined): GrowthProgress | null {
  if (growth === null || growth === undefined) {
    return null;
  }
  if (isMaxLevel(growth.level, growth.max_level)) {
    return {
      percent: 100,
      counter: tripMessages.growthMaxBadge,
      hint: profileMessages.growthMaxHint,
    };
  }
  if (typeof growth.exp !== 'number' || typeof growth.exp_to_next !== 'number') {
    return null;
  }
  const exp = Math.max(0, Math.floor(growth.exp));
  const remaining = Math.max(0, Math.floor(growth.exp_to_next));
  const cap = exp + remaining;
  const percent = cap === 0 ? 100 : Math.min(100, Math.max(0, Math.round((exp / cap) * 100)));
  return {
    percent,
    counter: profileMessages.growthExpCounter(exp, cap),
    hint: `${profileMessages.growthToNext(normalizeLevel(growth.level) + 1, remaining)} · ${profileMessages.growthDailyHint}`,
  };
}
