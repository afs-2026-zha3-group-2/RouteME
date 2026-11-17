import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { loadCurrentServiceSession, loadHelpReports, openServiceSession } from '../api';
import {
  adminErrorText,
  formatDateTime,
  reportReasonLabel,
  targetTypeLabel,
} from '../admin/adminFormat';
import { EmptyState } from '../shell/EmptyState';
import { adminMessages } from '../i18n/adminMessages';
import type { DemoUser, HelpReports, ServiceSessionDetail } from '../types';
import { reporterStatusLabel, statusTone } from './helpStatus';
import { ServiceChat } from './ServiceChat';

type Props = {
  currentUser: DemoUser;
  token: string | null;
};

/** 帮助与反馈：联系人工客服 + 我的举报两个区块。 */
export function HelpPage({ currentUser, token }: Props) {
  const [session, setSession] = useState<ServiceSessionDetail | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [reports, setReports] = useState<HelpReports | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsReload, setReportsReload] = useState(0);

  useEffect(() => {
    if (token === null) {
      return;
    }
    let active = true;
    loadCurrentServiceSession(token)
      .then((loaded) => {
        if (active) {
          setSession(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setSessionError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
          setSession(null);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (token === null) {
      return;
    }
    let active = true;
    setReportsError(null);
    loadHelpReports(token)
      .then((loaded) => {
        if (active) {
          setReports(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setReportsError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
        }
      });
    return () => {
      active = false;
    };
  }, [token, reportsReload]);

  const startChat = async () => {
    if (token === null) {
      return;
    }
    setStarting(true);
    setSessionError(null);
    try {
      setSession(await openServiceSession(token));
    } catch (caught: unknown) {
      const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
      setSessionError(code === 'ACCOUNT_BANNED' ? adminMessages.helpBanned : adminErrorText(code));
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="help-page">
      <header className="help-head">
        <p className="admin-eyebrow">{adminMessages.title}</p>
        <h1 className="help-title">{adminMessages.helpTitle}</h1>
        <p className="help-subtitle">{adminMessages.helpSubtitle}</p>
      </header>

      {token === null ? (
        <Alert
          type="info"
          showIcon
          title={adminMessages.helpLoginRequiredTitle}
          description={adminMessages.helpLoginRequiredBody}
        />
      ) : (
        <div className="help-grid">
          <section className="admin-panel help-panel">
            <h2 className="admin-section-title">{adminMessages.helpServiceSection}</h2>
            <p className="help-intro">{adminMessages.helpServiceIntro}</p>

            {sessionError !== null && (
              <Alert
                type="error"
                showIcon
                title={adminMessages.helpServiceFailed}
                description={sessionError}
              />
            )}

            {session === undefined && <Skeleton active paragraph={{ rows: 4 }} />}

            {session === null && (
              <Button type="primary" loading={starting} onClick={startChat}>
                {adminMessages.helpStartChat}
              </Button>
            )}

            {session !== null && session !== undefined && (
              <ServiceChat
                token={token}
                currentUser={currentUser}
                session={session}
                onSessionChange={setSession}
                onRestart={startChat}
              />
            )}
          </section>

          <section className="admin-panel help-panel">
            <h2 className="admin-section-title">{adminMessages.helpReportsSection}</h2>

            {reportsError !== null && (
              <Alert
                type="error"
                showIcon
                title={adminMessages.helpReportsFailed}
                description={adminErrorText(reportsError)}
                action={
                  <Button onClick={() => setReportsReload((previous) => previous + 1)}>
                    {adminMessages.retry}
                  </Button>
                }
              />
            )}

            {reportsError === null && reports === null && (
              <Skeleton active paragraph={{ rows: 3 }} />
            )}

            {reportsError === null && reports !== null && reports.items.length === 0 && (
              <EmptyState
                title={adminMessages.helpReportsEmpty}
                text={adminMessages.helpReportsHint}
              />
            )}

            {reportsError === null && reports !== null && reports.items.length > 0 && (
              <>
                <ul className="help-report-list">
                  {reports.items.map((report) => (
                    <li className="help-report" key={report.id}>
                      <div className="help-report-main">
                        <b>{report.code}</b>
                        <span>
                          {targetTypeLabel(report.target_type)} · {report.target_label ?? '—'}
                        </span>
                      </div>
                      <div className="help-report-meta">
                        <span className={`badge ${statusTone(report.status)}`}>
                          {reporterStatusLabel(report.status)}
                        </span>
                        <span className="help-report-reason">
                          {reportReasonLabel(report.reason)}
                        </span>
                        <span>{formatDateTime(report.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {reports.total > reports.items.length && (
                  <p className="admin-note">{adminMessages.onlyRecent}</p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}