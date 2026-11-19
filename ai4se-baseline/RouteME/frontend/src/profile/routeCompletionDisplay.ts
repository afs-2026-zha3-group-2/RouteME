import { tripMessages } from '../i18n/tripMessages';
import type { RouteCompletionState } from '../types';

export type RouteCompletionTone = 'is-good' | 'is-fair' | 'is-watch' | 'is-muted';

const TONES: Record<RouteCompletionState, RouteCompletionTone> = {
  good: 'is-good',
  neutral: 'is-fair',
  watch: 'is-watch',
  insufficient: 'is-muted',
};

/**
 * 防御性归一：缺失、null 与契约外的状态码一律按「无体验」处理，
 * 避免把没有样本的用户误判为正常或需留意。
 */
export function normalizeRouteCompletionState(
  state: RouteCompletionState | string | null | undefined,
): RouteCompletionState {
  if (state === null || state === undefined || !Object.hasOwn(TONES, state)) {
    return 'insufficient';
  }
  return state as RouteCompletionState;
}

/** 只做 0–100 的整数格式化；越界或非数值返回 null，由调用方降级为「-」。 */
function normalizeRate(rate: number | null | undefined): number | null {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) {
    return null;
  }
  const rounded = Math.round(rate);
  return rounded >= 0 && rounded <= 100 ? rounded : null;
}

/**
 * 状态码 → 文案与修饰类：阈值只由后端派生，前端不重复计算。
 * 数值缺失或越界时降级为「-」，不伪造 0% 或任何百分比。
 */
export function routeCompletionLine(
  state: RouteCompletionState | string | null | undefined,
  rate: number | null | undefined,
): { text: string; tone: RouteCompletionTone } {
  const normalized = normalizeRouteCompletionState(state);
  const percent = normalized === 'insufficient' ? null : normalizeRate(rate);
  if (percent === null) {
    return { text: tripMessages.routeCompletionInsufficient, tone: TONES.insufficient };
  }

  const base = `${tripMessages.routeCompletionLabel} ${percent}%`;
  if (normalized === 'good') {
    return { text: `${base} · ${tripMessages.routeCompletionGood}`, tone: TONES.good };
  }
  if (normalized === 'watch') {
    return { text: `${base} · ${tripMessages.routeCompletionWatch}`, tone: TONES.watch };
  }
  return { text: base, tone: TONES.neutral };
}
