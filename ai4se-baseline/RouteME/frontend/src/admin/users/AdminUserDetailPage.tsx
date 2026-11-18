import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { loadAdminUser } from '../../api';
import { adminMessages, banReasonLabel } from '../../i18n/adminMessages';
import { tripMessages } from '../../i18n/tripMessages';
import { Avatar } from '../../shell/Avatar';
import { StatusBadge } from '../../trips/StatusBadge';
import type { AdminStatusAction, AdminUserDetail, DemoUser } from '../../types';
import { AdminLayout } from '../AdminLayout';
import { AccountStatusBadge, ReportStatusBadge } from '../adminBadges';
import { adminErrorText, formatDateTime } from '../adminFormat';
import { availableActions, effectiveAccountStatus, statusActionLabel } from '../adminStatus';
import { StatusActionModal } from './StatusActionModal';

type Props = {
  token: string;
  userId: number;
  currentUser: DemoUser;
};

/** 用户详情：资料 + 账号状态 + 行程 / 体验 / 相关举报 + 处罚入口。 */
export function AdminUserDetailPage({ token, userId, currentUser }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<AdminStatusAction | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminUser(token, userId)
      .then((loaded) => {
        if (active) {
          setDetail(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token, userId, reloadKey]);

  const backLink = (
    <a className="detail-back" href="#/admin/users">
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11.5 5 6.5 10l5 5" />
      </svg>
      {adminMessages.tabUsers}
    </a>
  );

  if (error !== null) {
    const missing = error === 'USER_NOT_FOUND' || error === 'HTTP 404';
    return (
      <AdminLayout active="users" title={adminMessages.userDetailTitle}>
        {backLink}
        <Alert
          type="error"
          showIcon
          title={missing ? adminMessages.detailNotFound : adminMessages.loadFailed}
          description={missing ? undefined : adminErrorText(error)}
          action={
            missing ? undefined : (
              <Button onClick={() => setReloadKey((previous) => previous + 1)}>
                {adminMessages.retry}
              </Button>
            )
          }
        />
      </AdminLayout>
    );
  }

  if (loading && detail === null) {
    return (
      <AdminLayout active="users" title={adminMessages.userDetailTitle}>
        {backLink}
        <Skeleton active paragraph={{ rows: 8 }} />
      </AdminLayout>
    );
  }

  if (detail === null) {
    return (
      <AdminLayout active="users" title={adminMessages.userDetailTitle}>
        {backLink}
      </AdminLayout>
    );
  }

  const effective = effectiveAccountStatus(detail.status, detail.ban_expires_at, Date.now());
  const isSelf = detail.id === currentUser.id;
  const actions = isSelf ? [] : availableActions(effective);
  const showBanInfo = effective === 'BANNED';

  return (
    <AdminLayout
      active="users"
      title={adminMessages.userDetailTitle}
      subtitle={`${detail.nickname} · #${detail.id}`}
    >
      {backLink}

      <section className="admin-detail-hero admin-panel">
        <Avatar user={detail} size="lg" />
        <div className="admin-detail-hero-main">
          <div className="admin-detail-hero-title">
            <h2>{detail.nickname}</h2>
            <AccountStatusBadge status={detail.status} banExpiresAt={detail.ban_expires_at} />
            <span className="badge dusk no-dot">
              {detail.role === 'ADMIN' ? adminMessages.roleAdmin : adminMessages.roleUser}
            </span>
          </div>
          <p className="admin-detail-meta">
            <span>ID {detail.id}</span>
            <span>{detail.email ?? adminMessages.emailMissing}</span>
            <span>
              {adminMessages.colCreatedAt} {formatDateTime(detail.created_at)}
            </span>
          </p>
        </div>
      </section>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <h3 className="admin-section-title">{adminMessages.userProfileSection}</h3>
          <dl className="admin-facts">
            <div>
              <dt>{tripMessages.profileFactsSchool}</dt>
              <dd>{detail.school ?? '—'}</dd>
            </div>
            <div>
              <dt>{tripMessages.profileFactsCity}</dt>
              <dd>{detail.city ?? '—'}</dd>
            </div>
            <div>
              <dt>{adminMessages.userMajor}</dt>
              <dd>{detail.major ?? '—'}</dd>
            </div>
            <div>
              <dt>{tripMessages.profileFactsJob}</dt>
              <dd>{detail.job ?? '—'}</dd>
            </div>
          </dl>
          {detail.bio !== null && detail.bio !== undefined && detail.bio !== '' && (
            <p className="admin-bio">{detail.bio}</p>
          )}
          {detail.interests.length > 0 && (
            <div className="profile-tag-row">
              {detail.interests.map((interest) => (
                <span className="chip" key={interest}>
                  {interest}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel">
          <h3 className="admin-section-title">{adminMessages.userAccountSection}</h3>
          <dl className="admin-facts">
            <div>
              <dt>{adminMessages.colStatus}</dt>
              <dd>
                <AccountStatusBadge status={detail.status} banExpiresAt={detail.ban_expires_at} />
              </dd>
            </div>
            <div>
              <dt>{adminMessages.statusReason}</dt>
              <dd>{detail.status_reason ?? '—'}</dd>
            </div>
            <div>
              <dt>{adminMessages.statusUpdatedAt}</dt>
              <dd>{formatDateTime(detail.status_updated_at) || '—'}</dd>
            </div>
            <div>
              <dt>{adminMessages.statusUpdatedBy}</dt>
              <dd>
                {detail.status_updated_by === null || detail.status_updated_by === undefined
                  ? '—'
                  : detail.status_updated_by.nickname}
              </dd>
            </div>
            {showBanInfo && (
              <>
                <div>
                  <dt>{adminMessages.banReason}</dt>
                  <dd>
                    {detail.ban_reason_code === null || detail.ban_reason_code === undefined
                      ? '—'
                      : banReasonLabel(detail.ban_reason_code)}
                  </dd>
                </div>
                <div>
                  <dt>{adminMessages.banExpiresAt}</dt>
                  <dd>{formatDateTime(detail.ban_expires_at) || '—'}</dd>
                </div>
                <div>
                  <dt>{adminMessages.banNote}</dt>
                  <dd>{detail.ban_reason_note ?? '—'}</dd>
                </div>
              </>
            )}
          </dl>

          <div className="admin-actions">
            {actions.length === 0 && (
              <p className="admin-note">
                {isSelf ? adminMessages.statusSelfHint : adminMessages.invalidTransition}
              </p>
            )}
            {actions.map((action) => (
              <Button
                key={action}
                danger={action === 'BAN'}
                type={action === 'RESTORE' ? 'default' : 'primary'}
                onClick={() => setPendingAction(action)}
              >
                {statusActionLabel(action, effective)}
              </Button>
            ))}
          </div>
        </section>
      </div>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <h3 className="admin-section-title">
            {adminMessages.userTrips}
            <span className="admin-count">
              {adminMessages.totalPrefix} {detail.trip_total} {adminMessages.totalSuffix}
            </span>
          </h3>
          {detail.trips.length === 0 ? (
            <p className="admin-note">{adminMessages.noTrips}</p>
          ) : (
            <ul className="admin-list">
              {detail.trips.map((trip) => (
                <li key={trip.id} className="admin-list-row">
                  <a className="admin-link" href={`#/trips/${trip.id}`}>
                    {trip.title}
                  </a>
                  <span className="admin-list-meta">
                    <StatusBadge status={trip.status} />
                    <span>{trip.start_date}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {detail.trip_total > detail.trips.length && (
            <p className="admin-note">{adminMessages.onlyRecent}</p>
          )}
        </section>

        <section className="admin-panel">
          <h3 className="admin-section-title">
            {adminMessages.userExperiences}
            <span className="admin-count">
              {adminMessages.totalPrefix} {detail.experience_total} {adminMessages.totalSuffix}
            </span>
          </h3>
          {detail.experiences.length === 0 ? (
            <p className="admin-note">{adminMessages.noExperiences}</p>
          ) : (
            <ul className="admin-list">
              {detail.experiences.map((experience) => (
                <li key={experience.id} className="admin-list-row">
                  <a className="admin-link" href={`#/trips/${experience.trip_id}`}>
                    {experience.trip_title}
                  </a>
                  <span className="admin-list-meta">
                    <span>{formatDateTime(experience.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {detail.experience_total > detail.experiences.length && (
            <p className="admin-note">{adminMessages.onlyRecent}</p>
          )}
        </section>
      </div>

      <section className="admin-panel">
        <h3 className="admin-section-title">
          {adminMessages.userReports}
          <span className="admin-count">
            {adminMessages.totalPrefix} {detail.report_total} {adminMessages.totalSuffix}
          </span>
        </h3>
        {detail.reports.length === 0 ? (
          <p className="admin-note">{adminMessages.noReports}</p>
        ) : (
          <ul className="admin-list">
            {detail.reports.map((report) => (
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
                  <span>{formatDateTime(report.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {detail.report_total > detail.reports.length && (
          <p className="admin-note">{adminMessages.onlyRecent}</p>
        )}
      </section>

      {pendingAction !== null && (
        <StatusActionModal
          token={token}
          user={detail}
          action={pendingAction}
          open
          onCancel={() => setPendingAction(null)}
          onSaved={(updated) => setDetail(updated)}
        />
      )}
    </AdminLayout>
  );
}