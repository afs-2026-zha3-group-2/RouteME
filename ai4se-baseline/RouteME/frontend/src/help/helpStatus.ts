import { adminMessages } from '../i18n/adminMessages';
import type { ReportStatus, ServiceSessionStatus } from '../types';

export type ReportStatusTone = 'amber' | 'surf' | 'jade' | 'muted';

/**
 * 用户侧「我的举报」四态文案（design D14）。
 * PENDING 与 PROCESSING 必须是两个不同的词，避免「已受理」被误读为「已处理」。
 */
export function reporterStatusLabel(status: ReportStatus): string {
  if (status === 'PROCESSING') {
    return '已受理，正在处理';
  }
  if (status === 'RESOLVED') {
    return '已处理';
  }
  if (status === 'REJECTED') {
    return '举报不成立';
  }
  return '待处理';
}

/** 管理端四态文案：同一份映射表的后台措辞。 */
/** 客服会话四态提示：用户端会话头共用。 */
export function serviceChatHint(status: ServiceSessionStatus): string {
  if (status === 'HANDLING') {
    return adminMessages.helpHandling;
  }
  if (status === 'RESOLVED') {
    return adminMessages.helpResolved;
  }
  if (status === 'CLOSED') {
    return adminMessages.helpClosed;
  }
  return adminMessages.helpWaiting;
}

export function adminStatusLabel(status: ReportStatus): string {
  if (status === 'PROCESSING') {
    return adminMessages.sessionHandling;
  }
  if (status === 'RESOLVED') {
    return '已处理';
  }
  if (status === 'REJECTED') {
    return '举报不成立';
  }
  return '待处理';
}

/** 举报状态徽标色，复用行程徽标的配色令牌。 */
export function statusTone(status: ReportStatus): ReportStatusTone {
  if (status === 'PROCESSING') {
    return 'surf';
  }
  if (status === 'RESOLVED') {
    return 'jade';
  }
  if (status === 'REJECTED') {
    return 'muted';
  }
  return 'amber';
}