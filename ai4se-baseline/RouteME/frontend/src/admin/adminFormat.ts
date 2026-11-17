import { adminMessages } from '../i18n/adminMessages';
import { tripMessages } from '../i18n/tripMessages';
import type { ReportReason, ReportResolutionAction, ReportTargetType } from '../types';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * 后台时间口径：`YYYY-MM-DD HH:mm`（本地时区）。
 * 契约里的 `created_at` / `ban_expires_at` 是 ISO-8601，解析失败时回退原值。
 */
export function formatDateTime(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** 举报对象类型：后台列表与详情共用。 */
export function targetTypeLabel(type: ReportTargetType): string {
  if (type === 'trip') {
    return adminMessages.reportTargetTrip;
  }
  if (type === 'user') {
    return adminMessages.reportTargetUser;
  }
  return adminMessages.reportTargetExperience;
}

/** 举报对象跳转：用户回后台详情，行程回前台详情，体验回体验分享页。 */
export function reportTargetHref(
  type: ReportTargetType,
  id: number,
  exists: boolean,
): string | null {
  if (!exists) {
    return null;
  }
  if (type === 'user') {
    return `#/admin/users/${id}`;
  }
  if (type === 'trip') {
    return `#/trips/${id}`;
  }
  return `#/share/${id}`;
}

/** 举报原因沿用用户提交时的四项文案，后台不再另起一套措辞。 */
export function reportReasonLabel(reason: ReportReason): string {
  if (reason === 'harassment') {
    return tripMessages.reportReasonHarassment;
  }
  if (reason === 'fake') {
    return tripMessages.reportReasonFake;
  }
  if (reason === 'safety') {
    return tripMessages.reportReasonSafety;
  }
  return tripMessages.reportReasonOther;
}

/** 举报处置的历史动作标签（详情页「处置记录」区块）。 */
export function resolutionActionLabel(
  action: ReportResolutionAction | null | undefined,
): string {
  if (action === 'SUSPEND') {
    return adminMessages.resolutionSuspend;
  }
  if (action === 'BAN') {
    return adminMessages.resolutionBan;
  }
  if (action === 'UPDATE_BAN') {
    return adminMessages.resolutionUpdateBan;
  }
  if (action === 'REJECT') {
    return adminMessages.resolutionReject;
  }
  if (action === 'KEEP') {
    return adminMessages.actionKeep;
  }
  return '';
}

/** 契约错误码 → 后台可读提示；未知错误保留错误码便于排查。 */
export function adminErrorText(code: string): string {
  if (code === 'CANNOT_TARGET_SELF') {
    return adminMessages.cannotTargetSelf;
  }
  if (code === 'INVALID_STATUS_TRANSITION') {
    return adminMessages.invalidTransition;
  }
  if (code === 'REPORT_NOT_PENDING') {
    return adminMessages.reportNotPending;
  }
  if (code === 'REPORT_NOT_PROCESSING') {
    return adminMessages.reportNotProcessing;
  }
  if (code === 'SESSION_ALREADY_HANDLING') {
    return adminMessages.sessionAlreadyHandling;
  }
  if (code === 'SESSION_NOT_HANDLING') {
    return adminMessages.sessionNotHandling;
  }
  if (code === 'SESSION_CLOSED') {
    return adminMessages.serviceReadOnly;
  }
  if (code === 'ADMIN_REQUIRED') {
    return adminMessages.forbiddenBody;
  }
  if (code === 'ACCOUNT_SUSPENDED' || code === 'ACCOUNT_BANNED') {
    return adminMessages.profileBanBody;
  }
  return `${adminMessages.loadFailed}（${code}）`;
}

/** 状态已被其他管理员改变：提示后刷新详情，而不是当作未知错误。 */
export function isStaleAdminError(code: string): boolean {
  return (
    code === 'INVALID_STATUS_TRANSITION' ||
    code === 'REPORT_NOT_PENDING' ||
    code === 'REPORT_NOT_PROCESSING' ||
    code === 'SESSION_ALREADY_HANDLING' ||
    code === 'SESSION_NOT_HANDLING' ||
    code === 'SESSION_CLOSED' ||
    code === 'CANNOT_TARGET_SELF'
  );
}