import { adminStatusLabel, statusTone as reportStatusTone } from '../help/helpStatus';
import type { AccountStatus, ReportStatus, ServiceSessionStatus } from '../types';
import {
  accountStatusLabel,
  accountStatusTone,
  effectiveAccountStatus,
  serviceStatusLabel,
  serviceStatusTone,
} from './adminStatus';

/** 账号状态徽标：到期封禁按有效状态展示。 */
export function AccountStatusBadge({
  status,
  banExpiresAt,
}: {
  status: AccountStatus;
  banExpiresAt?: string | null;
}) {
  const effective = effectiveAccountStatus(status, banExpiresAt, Date.now());
  return <span className={`badge ${accountStatusTone(effective)}`}>{accountStatusLabel(effective)}</span>;
}

/** 举报四态徽标：与用户侧共用 `helpStatus` 的配色令牌。 */
export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`badge ${reportStatusTone(status)}`}>{adminStatusLabel(status)}</span>;
}

/** 客服会话三态徽标。 */
export function ServiceStatusBadge({ status }: { status: ServiceSessionStatus }) {
  return (
    <span className={`badge ${serviceStatusTone(status)}`}>{serviceStatusLabel(status)}</span>
  );
}