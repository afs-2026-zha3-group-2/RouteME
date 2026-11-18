import { useEffect, useState } from 'react';
import { Alert, Button, Input, Radio, Skeleton, Typography, message } from 'antd';
import { loadAdminReport, loadAdminUser, resolveAdminReport, startAdminReport } from '../../api';
import { adminMessages, banReasonLabel } from '../../i18n/adminMessages';
import { tripMessages } from '../../i18n/tripMessages';
import { creditLabel } from '../../profile/creditDisplay';
import { SoftSelect } from '../../shell/SoftSelect';
import { StatusBadge } from '../../trips/StatusBadge';
import type {
  AdminReportDetail,
  AdminUserDetail,
  ReportViolationType,
} from '../../types';
import { AdminLayout } from '../AdminLayout';
import { AccountStatusBadge, ReportStatusBadge } from '../adminBadges';
import {
  adminErrorText,
  formatDateTime,
  isStaleAdminError,
  reportReasonLabel,
  reportTargetHref,
  resolutionActionLabel,
  targetTypeLabel,
} from '../adminFormat';
import {
  emptyReportResolutionForm,
  toResolveRequest,
  validateReportResolution,
  type ReportResolutionFormErrors,
  type ReportResolutionFormState,
} from './reportActionForm';
import {
  OTHER_DEDUCTION_OPTIONS,
  REPORT_VIOLATION_OPTIONS,
  deductionOf,
  previewScore,
  safeScore,
  violationLabel,
} from './reportViolation';

type Props = {
  token: string;
  reportId: number;
};

/** 举报详情：上下文 + 开始处理 + 成立（违规类型扣分）/ 不成立处置。 */
export function AdminReportDetailPage({ token, reportId }: Props) {
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminReport(token, reportId)
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
  }, [token, reportId, reloadKey]);

  const reload = () => setReloadKey((previous) => previous + 1);

  const start = async () => {
    setStarting(true);
    setActionError(null);
    try {
      const updated = await startAdminReport(token, reportId);
      setDetail(updated);
      message.success(adminMessages.reportStarted);
    } catch (caught: unknown) {
      const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
      if (isStaleAdminError(code)) {
        message.warning(adminErrorText(code));
        reload();
      } else {
        setActionError(adminErrorText(code));
      }
    } finally {
      setStarting(false);
    }
  };

  const backLink = (
    <a className="detail-back" href="#/admin/reports">
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
      {adminMessages.tabReports}
    </a>
  );

  if (error !== null) {
    const missing = error === 'HTTP 404' || error === 'REPORT_NOT_FOUND';
    return (
      <AdminLayout active="reports" title={adminMessages.reportDetailTitle}>
        {backLink}
        <Alert
          type="error"
          showIcon
          title={missing ? adminMessages.detailNotFound : adminMessages.loadFailed}
          description={missing ? undefined : adminErrorText(error)}
          action={
            missing ? undefined : <Button onClick={reload}>{adminMessages.retry}</Button>
          }
        />
      </AdminLayout>
    );
  }

  if (loading && detail === null) {
    return (
      <AdminLayout active="reports" title={adminMessages.reportDetailTitle}>
        {backLink}
        <Skeleton active paragraph={{ rows: 8 }} />
      </AdminLayout>
    );
  }

  if (detail === null) {
    return (
      <AdminLayout active="reports" title={adminMessages.reportDetailTitle}>
        {backLink}
      </AdminLayout>
    );
  }

  const target = detail.target;
  const targetLink = reportTargetHref(target.type, target.id, target.exists);

  return (
    <AdminLayout
      active="reports"
      title={adminMessages.reportDetailTitle}
      subtitle={detail.code}
    >
      {backLink}

      <section className="admin-detail-hero admin-panel">
        <div className="admin-detail-hero-main">
          <div className="admin-detail-hero-title">
            <h2>{detail.code}</h2>
            <ReportStatusBadge status={detail.status} />
            <span className="badge muted no-dot">{reportReasonLabel(detail.reason)}</span>
          </div>
          <p className="admin-detail-meta">
            <span>
              {adminMessages.colReportTime} {formatDateTime(detail.created_at)}
            </span>
            <span>
              {adminMessages.colTarget} {targetTypeLabel(detail.target_type)}
            </span>
          </p>
        </div>
      </section>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <h3 className="admin-section-title">{adminMessages.reportContext}</h3>
          <dl className="admin-facts">
            <div>
              <dt>{adminMessages.colReporter}</dt>
              <dd>
                <a className="admin-link" href={`#/admin/users/${detail.reporter.id}`}>
                  {detail.reporter.nickname}
                </a>
              </dd>
            </div>
            <div>
              <dt>{adminMessages.colReported}</dt>
              <dd>
                {detail.reported_user === null || detail.reported_user === undefined ? (
                  adminMessages.reportedUserUnknown
                ) : (
                  <>
                    <a className="admin-link" href={`#/admin/users/${detail.reported_user.id}`}>
                      {detail.reported_user.nickname}
                    </a>
                    {detail.reported_user.credit_score !== null &&
                      detail.reported_user.credit_score !== undefined && (
                        <span className="admin-form-hint">
                          {' · '}
                          {adminMessages.reportReportedCredit}{' '}
                          {safeScore(detail.reported_user.credit_score)}
                          {' · '}
                          {creditLabel(detail.reported_user.credit_level)}
                        </span>
                      )}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>{adminMessages.colReason}</dt>
              <dd>{reportReasonLabel(detail.reason)}</dd>
            </div>
            <div>
              <dt>{adminMessages.reportNote}</dt>
              <dd>
                {detail.note === null || detail.note === undefined || detail.note === ''
                  ? adminMessages.reportNoteEmpty
                  : detail.note}
              </dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel">
          <h3 className="admin-section-title">{adminMessages.reportTarget}</h3>
          <dl className="admin-facts">
            <div>
              <dt>{adminMessages.colTarget}</dt>
              <dd>
                {targetLink !== null ? (
                  <a className="admin-link" href={targetLink}>
                    {target.label ?? '—'}
                  </a>
                ) : (
                  <span>{target.label ?? '—'}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>{adminMessages.reportTargetType}</dt>
              <dd>{targetTypeLabel(target.type)}</dd>
            </div>
            {!target.exists && (
              <div>
                <dt>{adminMessages.colStatus}</dt>
                <dd>{adminMessages.reportTargetMissing}</dd>
              </div>
            )}
          </dl>
          {target.content_excerpt !== null &&
            target.content_excerpt !== undefined &&
            target.content_excerpt !== '' && (
              <p className="admin-excerpt">{target.content_excerpt}</p>
            )}
        </section>
      </div>

      <ReportOrigin detail={detail} />

      <ReportEvidence token={token} detail={detail} />

      <section className="admin-panel">
        <h3 className="admin-section-title">{adminMessages.reportProcessHistory}</h3>
        <dl className="admin-facts">
          <div>
            <dt>{adminMessages.reportProcessedBy}</dt>
            <dd>
              {detail.processed_by === null || detail.processed_by === undefined
                ? '—'
                : detail.processed_by.nickname}
            </dd>
          </div>
          <div>
            <dt>{adminMessages.reportProcessingAt}</dt>
            <dd>{formatDateTime(detail.processing_at) || '—'}</dd>
          </div>
          <div>
            <dt>{adminMessages.reportResolvedAt}</dt>
            <dd>{formatDateTime(detail.resolved_at) || '—'}</dd>
          </div>
          <div>
            <dt>{adminMessages.reportHistoryViolation}</dt>
            <dd>
              {detail.violation_type === null || detail.violation_type === undefined
                ? '—'
                : violationLabel(detail.violation_type)}
            </dd>
          </div>
          <div>
            <dt>{adminMessages.reportHistoryDeduction}</dt>
            <dd>
              {detail.applied_deduction === null || detail.applied_deduction === undefined
                ? '—'
                : detail.applied_deduction === 0
                  ? '0'
                  : `-${detail.applied_deduction}`}
            </dd>
          </div>
          {detail.resolution_action !== null && detail.resolution_action !== undefined && (
            <div>
              <dt>{adminMessages.reportHistoryActionLegacy}</dt>
              <dd>{resolutionActionLabel(detail.resolution_action)}</dd>
            </div>
          )}
          <div>
            <dt>{adminMessages.reportResolutionNote}</dt>
            <dd>{detail.resolution_note ?? '—'}</dd>
          </div>
        </dl>
      </section>

      {detail.status === 'PENDING' && (
        <section className="admin-panel">
          {actionError !== null && (
            <Alert
              type="error"
              showIcon
              title={adminMessages.statusFailed}
              description={actionError}
            />
          )}
          <Button type="primary" loading={starting} onClick={start}>
            {adminMessages.reportStart}
          </Button>
        </section>
      )}

      {detail.status === 'PROCESSING' && (
        <ResolveForm
          token={token}
          detail={detail}
          onSaved={(updated) => {
            setDetail(updated);
            message.success(adminMessages.reportResolved);
          }}
          onReload={reload}
        />
      )}
    </AdminLayout>
  );
}

/**
 * 举报来源：聊天举报回放举报人与被举报人在该行程下的会话，行程举报给出行程概要。
 * 契约未提供 `context`（早期用户举报）时整块不渲染，由对象摘要兜底。
 */
function ReportOrigin({ detail }: { detail: AdminReportDetail }) {
  const context = detail.context;
  if (context === null || context === undefined) {
    return null;
  }
  const chat = context.origin === 'chat';
  const trip = context.trip ?? null;

  return (
    <section className="admin-panel">
      <h3 className="admin-section-title">
        {adminMessages.reportOrigin}
        <span className="admin-count">
          {chat ? adminMessages.reportOriginChat : adminMessages.reportOriginTrip}
        </span>
      </h3>
      <p className="admin-note">
        {chat ? adminMessages.reportOriginChatHint : adminMessages.reportOriginTripHint}
      </p>

      {trip === null ? (
        <p className="admin-note">{adminMessages.reportOriginTripMissing}</p>
      ) : (
        <dl className="admin-facts">
          <div>
            <dt>{adminMessages.reportOriginTripTitle}</dt>
            <dd>
              <a className="admin-link" href={`#/trips/${trip.id}`}>
                {trip.title ?? `#${trip.id}`}
              </a>
            </dd>
          </div>
          <div>
            <dt>{adminMessages.reportOriginTripDestination}</dt>
            <dd>{trip.destination ?? '—'}</dd>
          </div>
          <div>
            <dt>{adminMessages.reportOriginTripDates}</dt>
            <dd>
              {trip.start_date ?? '—'} – {trip.end_date ?? '—'}
            </dd>
          </div>
          <div>
            <dt>{adminMessages.colStatus}</dt>
            <dd>
              <StatusBadge status={trip.status} />
            </dd>
          </div>
          <div>
            <dt>{adminMessages.reportOriginTripPublisher}</dt>
            <dd>
              {trip.publisher === null || trip.publisher === undefined ? (
                '—'
              ) : (
                <a className="admin-link" href={`#/admin/users/${trip.publisher.id}`}>
                  {trip.publisher.nickname ?? `#${trip.publisher.id}`}
                </a>
              )}
            </dd>
          </div>
        </dl>
      )}

      {chat && (
        <>
          <h4 className="admin-section-subtitle">{adminMessages.reportOriginTranscript}</h4>
          {context.messages.length === 0 ? (
            <p className="admin-note">{adminMessages.reportOriginTranscriptEmpty}</p>
          ) : (
            <ol className="admin-transcript">
              {context.messages.map((message) => (
                <li key={message.id} className="admin-transcript-row">
                  <div className="admin-transcript-meta">
                    <a className="admin-link" href={`#/admin/users/${message.sender.id}`}>
                      {message.sender.nickname ?? `#${message.sender.id}`}
                    </a>
                    <span>{formatDateTime(message.sent_at)}</span>
                  </div>
                  <p className="admin-transcript-content">{message.content}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

/**
 * 判定依据：举报详情只给出目标摘要，处理人还需要被举报人的资料与近期内容才能决定
 * 暂停 / 封禁 / 不处罚。数据复用 `GET /admin/users/{id}`，不新增管理端接口。
 */
function ReportEvidence({ token, detail }: { token: string; detail: AdminReportDetail }) {
  const userId =
    detail.reported_user?.id ?? (detail.target.type === 'user' ? detail.target.id : null);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(userId !== null);

  useEffect(() => {
    if (userId === null) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminUser(token, userId)
      .then((loaded) => {
        if (active) {
          setUser(loaded);
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
  }, [token, userId]);

  const priorReports =
    user?.reports.filter((report) => report.id !== detail.id) ?? [];

  return (
    <section className="admin-panel">
      <h3 className="admin-section-title">
        {adminMessages.reportEvidence}
        {user !== null && (
          <span className="admin-count">
            <a className="admin-link" href={`#/admin/users/${user.id}`}>
              {adminMessages.reportEvidenceOpenUser}
            </a>
          </span>
        )}
      </h3>
      <p className="admin-note">{adminMessages.reportEvidenceHint}</p>

      {userId === null && <p className="admin-note">{adminMessages.reportEvidenceNoUser}</p>}

      {loading && <Skeleton active title={false} paragraph={{ rows: 4 }} />}

      {error !== null && (
        <Alert
          type="error"
          showIcon
          title={adminMessages.reportEvidenceLoadFailed}
          description={adminErrorText(error)}
        />
      )}

      {user !== null && (
        <>
          <dl className="admin-facts">
            <div>
              <dt>{adminMessages.colUser}</dt>
              <dd>
                <a className="admin-link" href={`#/admin/users/${user.id}`}>
                  {user.nickname}
                </a>{' '}
                <AccountStatusBadge status={user.status} banExpiresAt={user.ban_expires_at} />
              </dd>
            </div>
            <div>
              <dt>{adminMessages.colId}</dt>
              <dd>#{user.id}</dd>
            </div>
            <div>
              <dt>{adminMessages.colCreatedAt}</dt>
              <dd>{formatDateTime(user.created_at)}</dd>
            </div>
            <div>
              <dt>{tripMessages.profileFactsSchool}</dt>
              <dd>{user.school ?? '—'}</dd>
            </div>
            <div>
              <dt>{tripMessages.profileFactsCity}</dt>
              <dd>{user.city ?? '—'}</dd>
            </div>
            <div>
              <dt>{adminMessages.userMajor}</dt>
              <dd>{user.major ?? '—'}</dd>
            </div>
            <div>
              <dt>{tripMessages.profileFactsJob}</dt>
              <dd>{user.job ?? '—'}</dd>
            </div>
            <div>
              <dt>{adminMessages.statusReason}</dt>
              <dd>{user.status_reason ?? '—'}</dd>
            </div>
            {user.status === 'BANNED' && (
              <>
                <div>
                  <dt>{adminMessages.banReason}</dt>
                  <dd>
                    {user.ban_reason_code === null || user.ban_reason_code === undefined
                      ? '—'
                      : banReasonLabel(user.ban_reason_code)}
                  </dd>
                </div>
                <div>
                  <dt>{adminMessages.banExpiresAt}</dt>
                  <dd>{formatDateTime(user.ban_expires_at) || '—'}</dd>
                </div>
                <div>
                  <dt>{adminMessages.banNote}</dt>
                  <dd>{user.ban_reason_note ?? '—'}</dd>
                </div>
              </>
            )}
          </dl>

          <h4 className="admin-section-subtitle">{adminMessages.reportEvidenceBio}</h4>
          <p className="admin-bio">
            {user.bio === null || user.bio === undefined || user.bio === ''
              ? adminMessages.reportEvidenceBioEmpty
              : user.bio}
          </p>

          <div className="admin-detail-grid">
            <div>
              <h4 className="admin-section-subtitle">
                {adminMessages.userTrips}
                <span className="admin-count">
                  {adminMessages.totalPrefix} {user.trip_total} {adminMessages.totalSuffix}
                </span>
              </h4>
              {user.trips.length === 0 ? (
                <p className="admin-note">{adminMessages.noTrips}</p>
              ) : (
                <ul className="admin-list">
                  {user.trips.map((trip) => (
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
            </div>

            <div>
              <h4 className="admin-section-subtitle">
                {adminMessages.userExperiences}
                <span className="admin-count">
                  {adminMessages.totalPrefix} {user.experience_total}{' '}
                  {adminMessages.totalSuffix}
                </span>
              </h4>
              {user.experiences.length === 0 ? (
                <p className="admin-note">{adminMessages.noExperiences}</p>
              ) : (
                <ul className="admin-list">
                  {user.experiences.map((experience) => (
                    <li key={experience.id} className="admin-list-row">
                      <a className="admin-link" href={`#/share/${experience.trip_id}`}>
                        {experience.trip_title}
                      </a>
                      <span className="admin-list-meta">
                        <span>{formatDateTime(experience.created_at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <h4 className="admin-section-subtitle">{adminMessages.reportEvidencePriorReports}</h4>
          {priorReports.length === 0 ? (
            <p className="admin-note">{adminMessages.reportEvidenceNoPriorReports}</p>
          ) : (
            <ul className="admin-list">
              {priorReports.map((report) => (
                <li key={report.id} className="admin-list-row">
                  <a className="admin-link" href={`#/admin/reports/${report.id}`}>
                    {report.code}
                  </a>
                  <span className="admin-list-meta">
                    <span>
                      {report.direction === 'REPORTER'
                        ? adminMessages.directionReporter
                        : adminMessages.directionReported}
                    </span>
                    <span>{reportReasonLabel(report.reason)}</span>
                    <ReportStatusBadge status={report.status} />
                    <span>{formatDateTime(report.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ResolveForm({
  token,
  detail,
  onSaved,
  onReload,
}: {
  token: string;
  detail: AdminReportDetail;
  onSaved: (detail: AdminReportDetail) => void;
  onReload: () => void;
}) {
  const [form, setForm] = useState<ReportResolutionFormState>(emptyReportResolutionForm());
  const [errors, setErrors] = useState<ReportResolutionFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const before = safeScore(detail.reported_user?.credit_score);
  const deduction = deductionOf(form.violationType, form.otherDeduction);
  const showPreview = form.outcome === 'RESOLVED' && deduction !== null;
  const after = showPreview ? previewScore(before, deduction) : null;

  const update = (patch: Partial<ReportResolutionFormState>) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  const submit = async () => {
    const found = validateReportResolution(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await resolveAdminReport(token, detail.id, toResolveRequest(form));
      onSaved(updated);
    } catch (caught: unknown) {
      const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
      if (isStaleAdminError(code)) {
        message.warning(adminErrorText(code));
        onReload();
      } else {
        setSubmitError(adminErrorText(code));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-panel">
      <h3 className="admin-section-title">{adminMessages.reportResolve}</h3>

      {submitError !== null && (
        <Alert type="error" showIcon title={adminMessages.statusFailed} description={submitError} />
      )}

      <div className="admin-form">
        <label className="form-label">{adminMessages.reportOutcome}</label>
        <Radio.Group
          value={form.outcome}
          onChange={(event) => {
            const outcome = event.target.value as 'RESOLVED' | 'REJECTED';
            update({ outcome, violationType: '', otherDeduction: '' });
          }}
        >
          <Radio value="RESOLVED">{adminMessages.outcomeResolved}</Radio>
          <Radio value="REJECTED">{adminMessages.outcomeRejected}</Radio>
        </Radio.Group>
        {errors.outcome !== undefined && (
          <Typography.Text type="danger">{errors.outcome}</Typography.Text>
        )}

        {form.outcome === 'RESOLVED' && (
          <>
            <label className="form-label">{adminMessages.reportViolationType}</label>
            <SoftSelect
              value={form.violationType}
              options={[
                { value: '', label: adminMessages.reportViolationPlaceholder },
                ...REPORT_VIOLATION_OPTIONS.map((option) => ({
                  value: option.value,
                  label:
                    option.value === 'OTHER'
                      ? option.label
                      : `${option.label}（-${option.deduction}）`,
                })),
              ]}
              onChange={(value) =>
                update({
                  violationType: value === '' ? '' : (value as ReportViolationType),
                  otherDeduction: '',
                })
              }
              ariaLabel={adminMessages.reportViolationType}
            />
            {errors.violationType !== undefined && (
              <Typography.Text type="danger">{errors.violationType}</Typography.Text>
            )}

            {form.violationType === 'OTHER' && (
              <>
                <label className="form-label">{adminMessages.reportOtherDeduction}</label>
                <SoftSelect
                  value={form.otherDeduction === '' ? '' : String(form.otherDeduction)}
                  options={[
                    { value: '', label: adminMessages.reportOtherDeductionPlaceholder },
                    ...OTHER_DEDUCTION_OPTIONS.map((option) => ({
                      value: String(option.value),
                      label: option.label,
                    })),
                  ]}
                  onChange={(value) =>
                    update({ otherDeduction: value === '' ? '' : Number(value) })
                  }
                  ariaLabel={adminMessages.reportOtherDeduction}
                />
                {errors.otherDeduction !== undefined && (
                  <Typography.Text type="danger">{errors.otherDeduction}</Typography.Text>
                )}
              </>
            )}

            {showPreview && deduction !== null && after !== null && (
              <div className="admin-deduction-preview" data-testid="report-deduction-preview">
                <span className="form-label">{adminMessages.reportPreview}</span>
                <div className="admin-deduction-grid">
                  <div className="admin-deduction-cell">
                    <span className="admin-deduction-key">{adminMessages.reportPreviewCurrent}</span>
                    <strong className="admin-deduction-value">{before}</strong>
                  </div>
                  <div className="admin-deduction-cell">
                    <span className="admin-deduction-key">{adminMessages.reportPreviewDeduction}</span>
                    <strong className="admin-deduction-value minus">-{deduction}</strong>
                  </div>
                  <div className="admin-deduction-cell">
                    <span className="admin-deduction-key">{adminMessages.reportPreviewAfter}</span>
                    <strong className="admin-deduction-value after">{after}</strong>
                  </div>
                  {after === 0 && before < deduction && (
                    <p className="admin-deduction-cut">{adminMessages.reportPreviewCut}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <label className="form-label" htmlFor="report-resolution-note">
          {form.outcome === 'REJECTED'
            ? adminMessages.reportRejectionNote
            : adminMessages.reportViolationReason}
        </label>
        <Input.TextArea
          id="report-resolution-note"
          value={form.note}
          rows={3}
          maxLength={500}
          placeholder={adminMessages.reportResolutionNoteHint}
          onChange={(event) => update({ note: event.target.value })}
        />
        {errors.note !== undefined && (
          <Typography.Text type="danger">{errors.note}</Typography.Text>
        )}
      </div>

      <Button type="primary" loading={submitting} onClick={submit}>
        {adminMessages.reportSubmit}
      </Button>
    </section>
  );
}