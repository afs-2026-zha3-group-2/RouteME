import { adminMessages } from '../i18n/adminMessages';
import type { AccountStatus, AdminStatusAction, ServiceSessionStatus } from '../types';

export type AdminStatusTone = 'jade' | 'amber' | 'danger';
export type ServiceStatusTone = 'amber' | 'surf' | 'jade' | 'muted';

/** 到期封禁按 `ACTIVE` 计算（与后端 `effectiveStatus` 同口径，读路径不写库）。 */
export function effectiveAccountStatus(
  status: AccountStatus,
  banExpiresAt: string | null | undefined,
  now: number,
): AccountStatus {
  if (status !== 'BANNED' || banExpiresAt === null || banExpiresAt === undefined) {
    return status;
  }
  const expiresAt = Date.parse(banExpiresAt);
  if (Number.isNaN(expiresAt)) {
    return status;
  }
  return expiresAt > now ? 'BANNED' : 'ACTIVE';
}

export function accountStatusLabel(status: AccountStatus): string {
  if (status === 'SUSPENDED') {
    return adminMessages.accountSuspended;
  }
  if (status === 'BANNED') {
    return adminMessages.accountBanned;
  }
  return adminMessages.accountActive;
}

export function accountStatusTone(status: AccountStatus): AdminStatusTone {
  if (status === 'SUSPENDED') {
    return 'amber';
  }
  if (status === 'BANNED') {
    return 'danger';
  }
  return 'jade';
}

/**
 * 合法迁移决定可用动作（design §5.3）：
 * ACTIVE → 暂停 / 封禁；SUSPENDED → 封禁 / 恢复；BANNED → 更新封禁 / 恢复。
 */
export function availableActions(status: AccountStatus): AdminStatusAction[] {
  if (status === 'ACTIVE') {
    return ['SUSPEND', 'BAN'];
  }
  if (status === 'SUSPENDED') {
    return ['BAN', 'RESTORE'];
  }
  if (status === 'BANNED') {
    return ['BAN', 'RESTORE'];
  }
  return [];
}

export function statusActionLabel(
  action: AdminStatusAction,
  status?: AccountStatus,
): string {
  if (action === 'SUSPEND') {
    return adminMessages.actionSuspend;
  }
  if (action === 'BAN') {
    return status === 'BANNED' ? adminMessages.actionUpdateBan : adminMessages.actionBan;
  }
  return adminMessages.actionRestore;
}

/** 客服会话四态文案：队列筛选与详情头共用。 */
export function serviceStatusLabel(status: ServiceSessionStatus): string {
  if (status === 'HANDLING') {
    return adminMessages.sessionHandling;
  }
  if (status === 'RESOLVED') {
    return adminMessages.sessionResolved;
  }
  if (status === 'CLOSED') {
    return adminMessages.sessionClosed;
  }
  return adminMessages.sessionWaiting;
}

export function serviceStatusTone(status: ServiceSessionStatus): ServiceStatusTone {
  if (status === 'HANDLING') {
    return 'surf';
  }
  if (status === 'RESOLVED') {
    return 'jade';
  }
  if (status === 'CLOSED') {
    return 'muted';
  }
  return 'amber';
}