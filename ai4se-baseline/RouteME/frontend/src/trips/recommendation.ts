import type {
  RecommendationBreakdown,
  RecommendationReference,
  TravelerRecommendation,
} from '../types';

/**
 * 推荐展示纯函数：只做格式化，不计算业务分值。
 * 后端已经给出总分、分项与原因；这里禁止出现 50 / 30 / 20 / 10 之类的打分常量。
 */

/** 匹配度展示：`匹配度 90%`。 */
export function formatScore(score: number): string {
  return `匹配度 ${score}%`;
}

/** 分项明细：`目的地相同 +50 · 出发日期相同 +30`。 */
export function breakdownText(items: RecommendationBreakdown[]): string {
  return breakdownLines(items).join(' · ');
}

/** 分项明细逐行展示，交给详情区渲染。 */
export function breakdownLines(items: RecommendationBreakdown[]): string[] {
  return items.map((item) => `${item.label} +${item.points}`);
}

/** 把兴趣列表拼成「摄影和美食」。 */
function joinInterests(interests: string[]): string {
  if (interests.length <= 1) {
    return interests.join('');
  }
  return `${interests.slice(0, -1).join('、')}和${interests[interests.length - 1]}`;
}

/** 后端把「相差一天」写成独立的日期分项；这里只读文案，不重新计算日期差。 */
function isDifferentDayLabel(label: string): boolean {
  return label.includes('相差');
}

/**
 * 可读推荐原因：只用后端返回的命中维度与共同兴趣拼句。
 * 没有共同兴趣时不补写兴趣理由；分项缺失时返回空字符串，由调用方降级。
 */
export function reasonSentence(
  item: Pick<TravelerRecommendation, 'breakdown' | 'shared_interests'>,
): string {
  const breakdown = item.breakdown ?? [];
  const destination = breakdown.find((entry) => entry.dimension === 'destination');
  const date = breakdown.find((entry) => entry.dimension === 'date');
  const dimensions: string[] = [];

  if (destination !== undefined && date !== undefined) {
    if (isDifferentDayLabel(date.label)) {
      dimensions.push('目的地相同', date.label);
    } else {
      dimensions.push('目的地和日期相同');
    }
  } else if (destination !== undefined) {
    dimensions.push('目的地相同');
  } else if (date !== undefined) {
    dimensions.push(isDifferentDayLabel(date.label) ? date.label : '日期相同');
  }

  const interests = item.shared_interests ?? [];
  const interestText = interests.length > 0 ? `都喜欢${joinInterests(interests)}` : '';
  const dimensionText = dimensions.join('，');

  if (dimensionText !== '' && interestText !== '') {
    return `${dimensionText}，并且${interestText}`;
  }
  return dimensionText !== '' ? dimensionText : interestText;
}

/**
 * 推荐原因展示：优先使用可读句子；分项或兴趣缺失时退回后端 reasons 原文；
 * 两者都缺失时返回空字符串，不编造理由。
 */
export function recommendationReason(
  item: Pick<TravelerRecommendation, 'reasons' | 'breakdown' | 'shared_interests'>,
): string {
  const sentence = reasonSentence(item);
  if (sentence !== '') {
    return sentence;
  }
  return (item.reasons ?? []).join('，');
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