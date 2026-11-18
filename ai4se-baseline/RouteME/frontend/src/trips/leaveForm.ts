import { tripMessages } from '../i18n/tripMessages';
import type { LeaveReason } from '../types';

export const LEAVE_NOTE_MAX = 200;
export const LEAVE_EVIDENCE_MAX = 3;
export const LEAVE_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const LEAVE_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** 安全原因与不可抗力必须说明具体情况；个人原因选填。 */
export function leaveNoteRequired(reason: LeaveReason | undefined): boolean {
  return reason === 'force_majeure' || reason === 'safety';
}

/** 未选原因、或必填说明为空时，确认按钮不可用。 */
export function canSubmitLeave(reason: LeaveReason | undefined, note: string): boolean {
  if (reason === undefined) {
    return false;
  }
  return !leaveNoteRequired(reason) || note.trim() !== '';
}

/**
 * 前端先做一次图片大小 / 类型校验；服务端仍会按魔数复核。
 * @returns 错误文案；通过返回 null
 */
export function validateLeaveEvidence(file: { type: string; size: number }): string | null {
  if (!LEAVE_EVIDENCE_TYPES.includes(file.type)) {
    return tripMessages.leaveEvidenceBadType;
  }
  if (file.size > LEAVE_EVIDENCE_MAX_BYTES) {
    return tripMessages.leaveEvidenceTooLarge;
  }
  return null;
}
