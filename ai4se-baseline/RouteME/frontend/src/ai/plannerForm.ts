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

/** 本地日期 yyyy-MM-dd（不用 toISOString，避免 UTC 偏移把日期推前一天）。 */
export function todayIso(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 行程日期不得早于今天：对话里说「11 月 1 日」而今天已是 11 月 18 日时，
 * 旧实现会原样排一份已经过去的行程。非法日期回退到今天。
 */
export function clampPlanDate(date: string, now: Date = new Date()): string {
  const today = todayIso(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return today;
  }
  return date < today ? today : date;
}

/**
 * 页面初始值：日期默认今天（当天）。
 *
 * <p>日期留空会让天气卡与「生成行程」一直处于不可用状态，用户还得先点一次日期；
 * 默认当天既符合「所有日期都有默认值」的要求，也不阻止改期。
 */
export function defaultPlannerForm(now: Date = new Date()): PlannerFormValues {
  return { ...emptyPlannerForm, date: todayIso(now) };
}

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
    // 最后一道门：即使表单里残留了过去的日期，也不会真的去生成一份过期行程。
    date: clampPlanDate(form.date),
    duration: form.duration,
    budget_cents: yuanToCents(form.budgetYuan),
    travel_mode: form.travelMode,
    interests: [...form.interests],
    pace: form.pace,
    reduce_budget: reduceBudget,
  };
}