import { adminMessages, banReasonLabel } from '../i18n/adminMessages';
import type { AccountStatus, BanReasonCode } from '../types';

/**
 * 账号受限提示的展示内容。`BANNED` 带封禁理由与解封时间；`SUSPENDED` 只说明限制范围。
 * 处理原因与管理员备注属内部信息，不进入这里的任何字段。
 */
export type AccountStatusNoticeContent = {
  tone: 'error' | 'warning';
  title: string;
  body: string;
  /** 仅 `BANNED`：已本地化的封禁理由，缺失时显示占位符。 */
  reason?: string;
  /** 仅 `BANNED`：ISO-8601 解封时间，由视图按本地时区格式化。 */
  until?: string | null;
};

export function accountStatusNotice(
  status: AccountStatus | null | undefined,
  banReasonCode: BanReasonCode | null | undefined,
  banExpiresAt: string | null | undefined,
): AccountStatusNoticeContent | null {
  if (status === 'BANNED') {
    return {
      tone: 'error',
      title: adminMessages.profileBanTitle,
      body: adminMessages.profileBanBody,
      reason:
        banReasonCode === null || banReasonCode === undefined
          ? '—'
          : banReasonLabel(banReasonCode),
      until: banExpiresAt ?? null,
    };
  }
  if (status === 'SUSPENDED') {
    return {
      tone: 'warning',
      title: adminMessages.profileSuspendedTitle,
      body: adminMessages.profileSuspendedBody,
    };
  }
  return null;
}