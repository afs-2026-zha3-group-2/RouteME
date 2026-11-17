import { adminMessages } from '../../i18n/adminMessages';
import type {
  AdminStatusAction,
  AdminUserStatusRequest,
  BanReasonCode,
} from '../../types';

export type UserActionFormState = {
  action: AdminStatusAction;
  reason: string;
  banReasonCode: BanReasonCode | '';
  banReasonNote: string;
  /** ISO-8601 字符串（由日期控件在边界转换），空串表示未填写。 */
  banExpiresAt: string;
};

export type UserActionFormErrors = {
  reason?: string;
  banReasonCode?: string;
  banReasonNote?: string;
  banExpiresAt?: string;
};

const MAX_REASON_LENGTH = 200;
const MAX_NOTE_LENGTH = 200;

export function emptyUserActionForm(action: AdminStatusAction): UserActionFormState {
  return { action, reason: '', banReasonCode: '', banReasonNote: '', banExpiresAt: '' };
}

/**
 * 处罚表单校验（design §6.2 / A12 / A16）：
 * 暂停与封禁必填理由；封禁另需 8 项理由、`OTHER` 说明与未来解封时间。
 * 恢复只允许选填理由。
 */
export function validateUserAction(
  state: UserActionFormState,
  nowMs: number,
): UserActionFormErrors {
  const errors: UserActionFormErrors = {};
  const reason = state.reason.trim();
  if (state.action !== 'RESTORE') {
    if (reason === '') {
      errors.reason = adminMessages.errorReasonRequired;
    } else if (reason.length > MAX_REASON_LENGTH) {
      errors.reason = `${adminMessages.fieldReason}（${MAX_REASON_LENGTH} 字以内）`;
    }
  } else if (reason.length > MAX_REASON_LENGTH) {
    errors.reason = `${adminMessages.fieldReason}（${MAX_REASON_LENGTH} 字以内）`;
  }

  if (state.action === 'BAN') {
    if (state.banReasonCode === '') {
      errors.banReasonCode = adminMessages.errorBanReasonRequired;
    }
    const note = state.banReasonNote.trim();
    if (state.banReasonCode === 'OTHER' && note === '') {
      errors.banReasonNote = adminMessages.errorBanNoteRequired;
    } else if (note.length > MAX_NOTE_LENGTH) {
      errors.banReasonNote = `${adminMessages.fieldBanNote}（${MAX_NOTE_LENGTH} 字以内）`;
    }
    if (state.banExpiresAt === '') {
      errors.banExpiresAt = adminMessages.errorBanExpiresRequired;
    } else {
      const expiresAt = Date.parse(state.banExpiresAt);
      if (Number.isNaN(expiresAt) || expiresAt <= nowMs) {
        errors.banExpiresAt = adminMessages.errorBanExpiresFuture;
      }
    }
  }

  return errors;
}

export function canSubmitUserAction(state: UserActionFormState, nowMs: number): boolean {
  return Object.keys(validateUserAction(state, nowMs)).length === 0;
}

/** 表单 → 契约请求：RESTORE 忽略封禁字段；空字符串转 `null`。 */
export function toStatusRequest(state: UserActionFormState): AdminUserStatusRequest {
  const reason = state.reason.trim();
  if (state.action === 'SUSPEND') {
    return { action: 'SUSPEND', reason };
  }
  if (state.action === 'RESTORE') {
    return { action: 'RESTORE', reason: reason === '' ? null : reason };
  }
  return {
    action: 'BAN',
    reason,
    ban_reason_code: state.banReasonCode === '' ? null : state.banReasonCode,
    ban_reason_note: state.banReasonNote.trim() === '' ? null : state.banReasonNote.trim(),
    ban_expires_at: state.banExpiresAt === '' ? null : state.banExpiresAt,
  };
}