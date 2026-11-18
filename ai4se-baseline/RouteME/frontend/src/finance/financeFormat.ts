import type { LoanStatus, TravelLoan } from '../types';

/** 平台服务费费率：保费与借款本金统一按 5% 计。 */
export const FINANCE_FEE_RATE_PERCENT = 5;

/** 服务费（整数分）：与后端一致，四舍五入到分。 */
export function feeOf(cents: number): number {
  return Math.round((cents * FINANCE_FEE_RATE_PERCENT) / 100);
}

/** 借款净发放额 = 本金 − 服务费。 */
export function netOf(principalCents: number): number {
  return principalCents - feeOf(principalCents);
}

/** 借款日利率 0.05%，按本金与期限天数计息。 */
export const DAILY_INTEREST_BPS = 5;

/** 逾期日罚息 0.1%，按本金与已开始逾期天数累计。 */
export const DAILY_PENALTY_BPS = 10;

const BPS_DENOMINATOR = 10_000;
const MS_PER_DAY = 86_400_000;

/** 利息 = 本金 × 0.05% × 期限天数，四舍五入到分。 */
export function interestOf(principalCents: number, termDays: number): number {
  return Math.round((principalCents * DAILY_INTEREST_BPS * termDays) / BPS_DENOMINATOR);
}

/** 罚息 = 本金 × 0.1% × 逾期天数，四舍五入到分。 */
export function penaltyOf(principalCents: number, overdueDays: number): number {
  if (overdueDays <= 0) {
    return 0;
  }
  return Math.round((principalCents * DAILY_PENALTY_BPS * overdueDays) / BPS_DENOMINATOR);
}

/** 已开始的逾期天数：到期时刻之后的任意一秒都算第 1 天。 */
export function overdueDaysOf(dueAt: string, now: Date = new Date()): number {
  const elapsed = now.getTime() - Date.parse(dueAt);
  if (elapsed <= 0) {
    return 0;
  }
  return Math.ceil(elapsed / MS_PER_DAY);
}

/** 金额展示：整数分转「¥1,234.50」，不引入本地化差异。 */
export function money(cents: number): string {
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? '-' : '';
  const absolute = Math.abs(rounded);
  const yuan = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fen = String(absolute % 100).padStart(2, '0');
  return `${sign}¥${yuan}.${fen}`;
}

/**
 * 借款状态：落库只有 active / repaid，逾期按读取时刻对 `due_at` 派生。
 * 与后端 `TravelLoan.status(now)` 保持同一规则，便于页面先渲染再被服务端纠正。
 */
export function loanStatusOf(
  loan: Pick<TravelLoan, 'status' | 'due_at'>,
  now: Date = new Date(),
): LoanStatus {
  if (loan.status === 'repaid') {
    return 'repaid';
  }
  return now.getTime() > Date.parse(loan.due_at) ? 'overdue' : 'active';
}