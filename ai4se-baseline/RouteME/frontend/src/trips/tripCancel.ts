import type { TripCancelReason, UserTripCancelReason } from '../types';

export const CANCEL_REASON_OPTIONS: { value: UserTripCancelReason; label: string }[] = [
  { value: 'personal', label: '个人原因无法出行' },
  { value: 'time_changed', label: '行程时间发生变化' },
  { value: 'plan_changed', label: '行程计划发生变化' },
  { value: 'not_enough_people', label: '同行人数不足' },
  { value: 'weather', label: '天气或不可抗力原因' },
  { value: 'illness', label: '突发疾病或受伤' },
  { value: 'safety', label: '安全原因' },
  { value: 'other', label: '其他原因' },
];

const SYSTEM_REASON_LABELS: Partial<Record<TripCancelReason, string>> = {
  credit_restricted: '信用分低于 60，账号受限',
};

export function cancelReasonLabel(value: TripCancelReason | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return (
    CANCEL_REASON_OPTIONS.find((option) => option.value === value)?.label ??
    SYSTEM_REASON_LABELS[value] ??
    ''
  );
}
