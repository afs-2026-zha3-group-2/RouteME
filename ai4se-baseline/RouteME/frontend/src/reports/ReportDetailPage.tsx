import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { ApiError, loadMyReports } from '../api';
import { reportDetailMessages as copy } from '../i18n/notificationMessages';
import { formatChatTime } from '../utils/chatTime';
import type { DemoUser, MyReport } from '../types';

type Props = {
  currentUser: DemoUser;
  reportId: number;
};

function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    return `${copy.loadFailed}（${cause.code}）`;
  }
  return copy.loadFailed;
}

/**
 * 举报详情（`#/reports/{id}`）：通知中心「举报」类通知的跳转目标。
 *
 * <p>页面只展示举报人已经知道的业务事实；返回的举报不在本人记录中、
 * 或关联已不可访问时提示「相关内容当前不可查看」，不暴露后台备注或他人处罚细节。</p>
 */
export function ReportDetailPage({ currentUser, reportId }: Props) {
  const [reports, setReports] = useState<MyReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    loadMyReports(currentUser.id)
      .then(setReports)
      .catch((cause: unknown) => {
        setReports([]);
        setError(describeError(cause));
      });
  }, [currentUser.id]);

  useEffect(() => {
    setReports(null);
    load();
  }, [load]);

  const selected = reports?.find((report) => report.id === reportId) ?? null;

  return (
    <main className="trip-page report-detail" data-testid="report-detail">
      <header className="notification-center-head">
        <div>
          <h1 className="page-title">{copy.title}</h1>
          <p className="notification-center-sub">{copy.subtitle}</p>
        </div>
        <a className="ghost-link" href="#/notifications">
          {copy.back}
        </a>
      </header>

      {error !== null ? (
        <Alert
          type="error"
          showIcon
          title={copy.loadFailed}
          description={error}
          action={<Button onClick={load}>{copy.retry}</Button>}
        />
      ) : reports === null ? (
        <div className="report-detail-loading">
          <Spin size="small" />
        </div>
      ) : selected === null ? (
        <Alert
          type="warning"
          showIcon
          title={copy.unavailable}
          description={copy.notFound}
          data-testid="report-detail-unavailable"
        />
      ) : (
        <section className="report-detail-card" data-testid="report-detail-card">
          <h2 className="report-detail-code">
            {copy.code}
            <span>{selected.code}</span>
          </h2>
          <dl className="report-detail-fields">
            <div>
              <dt>{copy.target}</dt>
              <dd>{copy.targetType(selected.target_type)}</dd>
            </div>
            <div>
              <dt>{copy.reason}</dt>
              <dd>{copy.reasonLabel(selected.reason)}</dd>
            </div>
            <div>
              <dt>{copy.status}</dt>
              <dd data-testid="report-detail-status">{copy.statusLabel(selected.status)}</dd>
            </div>
            <div>
              <dt>{copy.createdAt}</dt>
              <dd>{formatChatTime(selected.created_at)}</dd>
            </div>
            <div>
              <dt>{copy.processingAt}</dt>
              <dd>{selected.processing_at === null ? '—' : formatChatTime(selected.processing_at)}</dd>
            </div>
            <div>
              <dt>{copy.resolvedAt}</dt>
              <dd>{selected.resolved_at === null ? '—' : formatChatTime(selected.resolved_at)}</dd>
            </div>
          </dl>
        </section>
      )}

      {reports !== null && reports.length > 0 ? (
        <section className="report-detail-history">
          <h2>{copy.history}</h2>
          <ul>
            {reports.map((report) => (
              <li key={report.id}>
                <a
                  className={report.id === reportId ? 'report-detail-link is-active' : 'report-detail-link'}
                  href={`#/reports/${report.id}`}
                >
                  <span>{report.code}</span>
                  <span>{copy.reasonLabel(report.reason)}</span>
                  <span>{copy.statusLabel(report.status)}</span>
                  <span>{formatChatTime(report.created_at)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}