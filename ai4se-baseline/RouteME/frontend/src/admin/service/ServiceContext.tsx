import { adminMessages } from '../../i18n/adminMessages';
import { Avatar } from '../../shell/Avatar';
import type { ServiceSessionDetail } from '../../types';
import { AccountStatusBadge, ReportStatusBadge } from '../adminBadges';
import { formatDateTime } from '../adminFormat';

/** 客服工作台右栏：当前用户的基础账号信息与相关举报。 */
export function ServiceContext({ session }: { session: ServiceSessionDetail }) {
  const reports = session.reports ?? [];

  return (
    <aside className="admin-service-context">
      <section className="admin-panel">
        <h3 className="admin-section-title">{adminMessages.serviceUserSection}</h3>
        <div className="admin-service-user">
          <Avatar user={session.user} size="lg" />
          <div>
            <b>{session.user.nickname}</b>
            <span>ID {session.user.id}</span>
          </div>
          <AccountStatusBadge status={session.user.status} />
        </div>
        <dl className="admin-facts">
          <div>
            <dt>{adminMessages.colEmail}</dt>
            <dd>{session.user.email ?? adminMessages.emailMissing}</dd>
          </div>
          <div>
            <dt>{adminMessages.colCreatedAt}</dt>
            <dd>{formatDateTime(session.user.created_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-panel">
        <h3 className="admin-section-title">{adminMessages.serviceReportsSection}</h3>
        {reports.length === 0 ? (
          <p className="admin-note">{adminMessages.noReports}</p>
        ) : (
          <ul className="admin-list">
            {reports.map((report) => (
              <li key={report.id} className="admin-list-row">
                <a className="admin-link" href={`#/admin/reports/${report.id}`}>
                  {report.code}
                </a>
                <span className="admin-list-meta">
                  <span className="badge muted no-dot">
                    {report.direction === 'REPORTER'
                      ? adminMessages.directionReporter
                      : adminMessages.directionReported}
                  </span>
                  <ReportStatusBadge status={report.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}