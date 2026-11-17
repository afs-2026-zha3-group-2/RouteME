import { adminMessages } from '../../i18n/adminMessages';
import type {
  AdminReportResolveRequest,
  BanReasonCode,
  ReportResolutionAction,
} from '../../types';

export type ReportAction = Exclude<ReportResolutionAction, 'REJECT'>;

export type ReportResolutionFormState = {
  outcome: 'RESOLVED' | 'REJECTED' | '';
  note: string;
  action: ReportAction | '';
  banReasonCode: BanReasonCode | '';
  banReasonNote: string;
  banExpiresAt: string;
};

export type ReportResolutionFormErrors = {
  outcome?: string;
  note?: string;
  action?: string;
  banReasonCode?: string;
  banReasonNote?: string;
  banExpiresAt?: string;
};

const MAX_NOTE_LENGTH = 500;
const MAX_BAN_NOTE_LENGTH = 200;

export function emptyReportResolutionForm(): ReportResolutionFormState {
  return {
    outcome: '',
    note: '',
    action: '',
    banReasonCode: '',
    banReasonNote: '',
    banExpiresAt: '',
  };
}

function needsBanFields(action: ReportAction | ''): boolean {
  return action === 'BAN' || action === 'UPDATE_BAN';
}

/**
 * 举报处理表单校验（A31）：备注必填；成立时必须选择处罚动作；
 * 封禁 / 更新封禁需要 8 项理由、`OTHER` 说明与未来解封时间。
 */
export function validateReportResolution(
  state: ReportResolutionFormState,
  nowMs: number,
): ReportResolutionFormErrors {
  const errors: ReportResolutionFormErrors = {};
  if (state.outcome === '') {
    errors.outcome = adminMessages.errorOutcomeRequired;
  }
  const note = state.note.trim();
  if (note === '') {
    errors.note = adminMessages.reportResolutionNoteHint;
  } else if (note.length > MAX_NOTE_LENGTH) {
    errors.note = `${adminMessages.reportResolutionNote}（${MAX_NOTE_LENGTH} 字以内）`;
  }

  if (state.outcome === 'RESOLVED') {
    if (state.action === '') {
      errors.action = adminMessages.errorActionRequired;
    }
    if (needsBanFields(state.action)) {
      if (state.banReasonCode === '') {
        errors.banReasonCode = adminMessages.errorBanReasonRequired;
      }
      const banNote = state.banReasonNote.trim();
      if (state.banReasonCode === 'OTHER' && banNote === '') {
        errors.banReasonNote = adminMessages.errorBanNoteRequired;
      } else if (banNote.length > MAX_BAN_NOTE_LENGTH) {
        errors.banReasonNote = `${adminMessages.fieldBanNote}（${MAX_BAN_NOTE_LENGTH} 字以内）`;
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
  }

  return errors;
}

export function canSubmitReportResolution(
  state: ReportResolutionFormState,
  nowMs: number,
): boolean {
  return Object.keys(validateReportResolution(state, nowMs)).length === 0;
}

export function toResolveRequest(
  state: ReportResolutionFormState,
): AdminReportResolveRequest {
  const note = state.note.trim();
  if (state.outcome === 'REJECTED') {
    return { outcome: 'REJECTED', note };
  }
  const base: AdminReportResolveRequest = {
    outcome: 'RESOLVED',
    note,
    action: state.action === '' ? null : state.action,
  };
  if (!needsBanFields(state.action)) {
    return base;
  }
  return {
    ...base,
    ban_reason_code: state.banReasonCode === '' ? null : state.banReasonCode,
    ban_reason_note: state.banReasonNote.trim() === '' ? null : state.banReasonNote.trim(),
    ban_expires_at: state.banExpiresAt === '' ? null : state.banExpiresAt,
  };
}