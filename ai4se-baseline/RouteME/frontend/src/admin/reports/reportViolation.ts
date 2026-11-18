import { adminMessages } from '../../i18n/adminMessages';
import type { ReportViolationType } from '../../types';

export type ReportViolationOption = {
  value: ReportViolationType;
  label: string;
  deduction: number;
};

/** 与后端 `ReportViolationEnum` 同值；双端由单测断言同一组样例。 */
export const REPORT_VIOLATION_OPTIONS: ReportViolationOption[] = [
  { value: 'HARASSMENT', label: adminMessages.violationHarassment, deduction: 10 },
  { value: 'FAKE_TRIP', label: adminMessages.violationFakeTrip, deduction: 15 },
  { value: 'FRAUD_RISK', label: adminMessages.violationFraudRisk, deduction: 30 },
  { value: 'ILLEGAL_CONTENT', label: adminMessages.violationIllegalContent, deduction: 20 },
  { value: 'IMPERSONATION', label: adminMessages.violationImpersonation, deduction: 20 },
  { value: 'NO_SHOW_DISRUPTION', label: adminMessages.violationNoShow, deduction: 10 },
  { value: 'PRIVACY_LEAK', label: adminMessages.violationPrivacyLeak, deduction: 30 },
  { value: 'OTHER', label: adminMessages.violationOther, deduction: 0 },
];

export const OTHER_DEDUCTION_OPTIONS = [5, 10, 20, 30].map((value) => ({
  value,
  label: `-${value}`,
}));

const LABELS = new Map(REPORT_VIOLATION_OPTIONS.map((option) => [option.value, option.label]));

export function violationLabel(value: ReportViolationType | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return LABELS.get(value) ?? '';
}

/** 当前选择对应的扣分；类型未选或 OTHER 未选档位时返回 null（不展示预览）。 */
export function deductionOf(
  type: ReportViolationType | '',
  otherDeduction: number | '',
): number | null {
  if (type === '') {
    return null;
  }
  if (type === 'OTHER') {
    return otherDeduction === '' || !OTHER_DEDUCTION_OPTIONS.some((item) => item.value === otherDeduction)
      ? null
      : otherDeduction;
  }
  return REPORT_VIOLATION_OPTIONS.find((option) => option.value === type)?.deduction ?? null;
}

/** 预览按 0 截断；只用于展示，实际以服务端记账为准。 */
export function previewScore(before: number, deduction: number): number {
  return Math.max(0, before - deduction);
}

/** 分数夹到 0–100 的整数；缺失按初始 80。 */
export function safeScore(score: number | null | undefined): number {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return 80;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
