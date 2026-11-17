import { tripMessages } from '../i18n/tripMessages';
import type { CreditLevel } from '../types';

const LABELS: Record<CreditLevel, string> = {
  excellent: tripMessages.creditLevelExcellent,
  good: tripMessages.creditLevelGood,
  fair: tripMessages.creditLevelFair,
  low: tripMessages.creditLevelLow,
  risk: tripMessages.creditLevelRisk,
};

const TONES: Record<CreditLevel, string> = {
  excellent: 'is-excellent',
  good: 'is-good',
  fair: 'is-fair',
  low: 'is-low',
  risk: 'is-risk',
};

/**
 * 防御性归一：契约外的等级码按初始档 good 处理，避免把有效用户误标为风险。
 * 阈值只在后端实现，前端不重复计算等级。
 */
export function normalizeCreditLevel(level: CreditLevel | string | null | undefined): CreditLevel {
  if (level === null || level === undefined || !Object.hasOwn(LABELS, level)) {
    return 'good';
  }
  return level as CreditLevel;
}

/** 分数夹到 0–100 的整数；缺失时按初始 80。 */
export function normalizeCreditScore(score: number | null | undefined): number {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return 80;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function creditLabel(level: CreditLevel | string | null | undefined): string {
  return LABELS[normalizeCreditLevel(level)];
}

export function creditTone(level: CreditLevel | string | null | undefined): string {
  return TONES[normalizeCreditLevel(level)];
}

/** 「信用分：80 / 100 · 信用良好」：分数与等级文字必须同时出现。 */
export function creditLine(score: number | null | undefined, level: CreditLevel | string | null | undefined): string {
  return `${tripMessages.creditPrefix}：${normalizeCreditScore(score)} / 100 · ${creditLabel(level)}`;
}
