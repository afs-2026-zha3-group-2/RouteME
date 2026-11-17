/**
 * AI 规划表单纯逻辑：门控、条件 → generate 请求体、预算元 ↔ 分换算。
 * 不发请求、不读 DOM（design §4.2）。
 */
import type { AiDuration, AiGenerateRequest, AiPace, AiPlace, AiTravelMode } from '../types';

export type PlannerFormValues = {
  origin: AiPlace | null;
  destination: AiPlace | null;
  date: string;
  duration: AiDuration;
  budgetYuan: string;
  travelMode: AiTravelMode;
  interests: string[];
  pace: AiPace;
};

export const emptyPlannerForm: PlannerFormValues = {
  origin: null,
  destination: null,
  date: '',
  duration: 'one_day',
  budgetYuan: '',
  travelMode: 'transit',
  interests: [],
  pace: 'moderate',
};

function hasPlace(place: AiPlace | null): place is AiPlace {
  return place !== null && place.name.trim() !== '';
}

/** AC4：出发地 + 目的地 + 日期必填；预算 / 时长 / 方式 / 兴趣 / 节奏可选。 */
export function canGenerate(form: PlannerFormValues): boolean {
  return hasPlace(form.origin) && hasPlace(form.destination) && form.date !== '';
}

/** 元文本 → 整数分；空白 / 非法 / 非正数返回 null（请求不带预算）。 */
export function yuanToCents(text: string): number | null {
  const value = text.trim();
  if (value === '') {
    return null;
  }
  const yuan = Number(value);
  if (!Number.isFinite(yuan) || yuan <= 0) {
    return null;
  }
  return Math.round(yuan * 100);
}

/** 条件 → generate 契约请求体；调用前必须通过 canGenerate 门控。 */
export function toGenerateRequest(form: PlannerFormValues, reduceBudget = false): AiGenerateRequest {
  if (!hasPlace(form.origin) || !hasPlace(form.destination)) {
    throw new Error('请先选择出发地和目的地');
  }
  return {
    origin: form.origin,
    destination: form.destination,
    date: form.date,
    duration: form.duration,
    budget_cents: yuanToCents(form.budgetYuan),
    travel_mode: form.travelMode,
    interests: [...form.interests],
    pace: form.pace,
    reduce_budget: reduceBudget,
  };
}