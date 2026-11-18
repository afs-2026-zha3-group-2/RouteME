import { financeMessages as m } from '../i18n/financeMessages';
import type {
  InsurancePolicy,
  InsuranceStatus,
  LoanStatus,
  TripStatus,
  WalletEntryType,
} from '../types';

const ERROR_TEXT: Record<string, string> = {
  INSUFFICIENT_BALANCE: m.errorInsufficientBalance,
  ACTIVE_LOAN_EXISTS: m.errorActiveLoanExists,
  LOAN_NOT_ACTIVE: m.errorLoanNotActive,
  FORBIDDEN: m.errorForbidden,
  TRIP_NOT_OPEN: m.errorTripNotOpen,
  ACCOUNT_SUSPENDED: m.errorAccountSuspended,
  ACCOUNT_BANNED: m.errorAccountBanned,
  INVALID_INPUT: m.errorInvalidInput,
};

/** 服务端错误码 → 中文提示；未知码统一给出可重试文案。 */
export function financeErrorText(code: string): string {
  return ERROR_TEXT[code] ?? m.errorUnknown;
}

export function loanStatusLabel(status: LoanStatus): string {
  if (status === 'repaid') {
    return m.loanStatusRepaid;
  }
  return status === 'overdue' ? m.loanStatusOverdue : m.loanStatusActive;
}

/** 第三方保险状态 → 中文标签。 */
export function insuranceStatusLabel(status: InsuranceStatus): string {
  if (status === 'active') {
    return m.insuranceStatusActive;
  }
  return status === 'expired' ? m.insuranceStatusExpired : m.insuranceStatusNotPurchased;
}

/** 已写入的第三方投保记录状态 → 中文标签。 */
export function insurancePolicyStatusLabel(status: InsurancePolicy['status']): string {
  return status === 'expired' ? m.insurancePolicyExpired : m.insurancePolicyActive;
}

export function ledgerEntryLabel(entryType: WalletEntryType): string {
  return entryType === 'loan_repayment' ? m.ledgerLoanRepayment : m.ledgerLoanDisbursement;
}

export function financeTripStatusLabel(status: TripStatus): string | null {
  if (status === 'recruiting') {
    return m.tripStatusRecruiting;
  }
  if (status === 'full') {
    return m.tripStatusFull;
  }
  return status === 'ongoing' ? m.tripStatusOngoing : null;
}