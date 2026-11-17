import { Alert } from 'antd';
import { formatDateTime } from '../admin/adminFormat';
import { adminMessages } from '../i18n/adminMessages';
import type { AccountStatus, BanReasonCode } from '../types';
import { accountStatusNotice } from './accountStatusNoticeModel';

type Props = {
  status?: AccountStatus | null;
  banReasonCode?: BanReasonCode | null;
  banExpiresAt?: string | null;
  className?: string;
};

/**
 * 账号受限提示条：本人资料页与全站顶栏共用，保证封禁理由与解封时间口径一致。
 */
export function AccountStatusBanner({ status, banReasonCode, banExpiresAt, className }: Props) {
  const notice = accountStatusNotice(status, banReasonCode, banExpiresAt);
  if (notice === null) {
    return null;
  }

  const classes = className === undefined ? 'account-status-notice' : `account-status-notice ${className}`;

  if (notice.tone === 'warning') {
    return (
      <Alert
        type="warning"
        showIcon
        className={classes}
        title={notice.title}
        description={notice.body}
      />
    );
  }

  return (
    <Alert
      type="error"
      showIcon
      className={classes}
      title={notice.title}
      description={
        <>
          <p>{notice.body}</p>
          <p>
            {adminMessages.profileBanReasonPrefix}
            {notice.reason}
          </p>
          <p>
            {adminMessages.profileBanUntilPrefix}
            {formatDateTime(notice.until) || '—'}
          </p>
        </>
      }
    />
  );
}