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