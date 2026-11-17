import type { RecommendationBreakdown, RecommendationReference } from '../types';

/**
 * 推荐展示纯函数：只做格式化，不计算业务分值。
 * 后端已经给出总分、分项与原因；这里禁止出现 50 / 30 / 20 / 10 之类的打分常量。
 */

/** 总分展示：`90 分`。 */
export function formatScore(score: number): string {
  return `${score} 分`;
}

/** 分项明细：`目的地相同 +50 · 出发日期相同 +30`。 */
export function breakdownText(items: RecommendationBreakdown[]): string {
  return items.map((item) => `${item.label} +${item.points}`).join(' · ');
}

/** 参照说明：`以 广州 · 2026-11-20 为参照`。 */
export function referenceText(reference: RecommendationReference): string {
  return `以 ${reference.destination} · ${reference.start_date} 为参照`;
}

/** 空状态文案。 */
export function emptyRecommendationText(): { title: string; text: string } {
  return {
    title: '暂时没有合适的同行者',
    text: '换一条目的地或日期更接近的行程，或者再等等新的计划。',
  };
}