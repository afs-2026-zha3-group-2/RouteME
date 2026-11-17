import { tripMessages } from '../i18n/tripMessages';
import type { LeavePreview, LeaveReason, LeaveResult } from '../types';

export const LEAVE_REASON_OPTIONS: { value: LeaveReason; label: string }[] = [
  { value: 'personal', label: tripMessages.leaveReasonPersonal },
  { value: 'force_majeure', label: tripMessages.leaveReasonForceMajeure },
  { value: 'safety', label: tripMessages.leaveReasonSafety },
];

export function leaveReasonLabel(reason: LeaveReason | null | undefined): string {
  return LEAVE_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? '';
}

/** 预览文案：只展示服务端计算，前端不重复扣分。 */
export function leavePreviewText(preview: LeavePreview): string {
  switch (preview.message_code) {
    case 'pending_review':
      return tripMessages.leavePreviewPending;
    case 'no_penalty':
      return tripMessages.leavePreviewNoPenalty;
    case 'during_trip':
      return tripMessages.leavePreviewDuring;
    case 'at_floor':
      return tripMessages.leavePreviewAtFloor;
    case 'penalty_doubled':
      return tripMessages.leavePreviewDoubled
        .replace('{delta}', String(preview.applied_delta))
        .replace('{ordinal}', String(preview.monthly_ordinal))
        .replace('{score}', String(preview.resulting_score));
    case 'penalty':
    default:
      return tripMessages.leavePreviewPenalty
        .replace('{delta}', String(preview.applied_delta))
        .replace('{score}', String(preview.resulting_score));
  }
}

export function leaveResultText(result: LeaveResult): string {
  const before = result.credit_score - result.applied_delta;
  return tripMessages.leaveSuccessWithScore
    .replace('{before}', String(before))
    .replace('{after}', String(result.credit_score));
}
