import { tripMessages } from '../i18n/tripMessages';
import type { ApplicationStatus } from '../types';

/** 申请状态的展示文案；`left` 表示已接受后主动退出。 */
export function applicationLabel(status: ApplicationStatus): string {
  if (status === 'pending') {
    return tripMessages.applyStatusPending;
  }
  if (status === 'accepted') {
    return tripMessages.applyStatusAccepted;
  }
  if (status === 'rejected') {
    return tripMessages.applyStatusRejected;
  }
  if (status === 'left') {
    return tripMessages.applyStatusLeft;
  }
  return tripMessages.applyStatusCancelled;
}
