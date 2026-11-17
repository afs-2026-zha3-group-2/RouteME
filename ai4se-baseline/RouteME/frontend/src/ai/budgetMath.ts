/**
 * 预算纯计算：四项合计、超预算差额、分 → 元展示换算。
 * 不读 DOM（design §4.2）；「AI 估算」恒标口径见 aiMessages。
 */
import type { AiBudget } from '../types';

/** 四项合计：不信任 AI 的 total_cents 字段，恒重算。 */
export function sumBudgetCents(budget: AiBudget): number {
  return budget.transport_cents + budget.tickets_cents + budget.food_cents + budget.other_cents;
}

/** 超预算差额（分）；未超预算（含恰好相等）或用户未填预算返回 null。 */
export function overBudgetCents(budget: AiBudget, userBudgetCents: number | null): number | null {
  if (userBudgetCents === null) {
    return null;
  }
  const over = sumBudgetCents(budget) - userBudgetCents;
  return over > 0 ? over : null;
}

/** 分 → 元（展示用，可能带小数）。 */
export function centsToYuan(cents: number): number {
  return cents / 100;
}