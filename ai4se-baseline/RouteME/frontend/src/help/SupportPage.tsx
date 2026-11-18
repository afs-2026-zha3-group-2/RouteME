import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { loadCurrentServiceSession, openServiceSession } from '../api';
import { adminErrorText } from '../admin/adminFormat';
import { adminMessages } from '../i18n/adminMessages';
import type { DemoUser, ServiceSessionDetail } from '../types';
import { serviceChatHint } from './helpStatus';
import { ServiceChat } from './ServiceChat';

type Props = {
  currentUser: DemoUser;
  token: string | null;
};

const TIPS = [
  { title: adminMessages.supportTipPublishTitle, text: adminMessages.supportTipPublishText },
  { title: adminMessages.supportTipReportTitle, text: adminMessages.supportTipReportText },
  { title: adminMessages.supportTipAccountTitle, text: adminMessages.supportTipAccountText },
];

/**
 * 用户侧独立客服入口：只承载「联系人工客服」一件事。
 * 举报进度属于管理后台（#/help 仅管理员可见），这里不展示任何举报记录。
 */
export function SupportPage({ currentUser, token }: Props) {
  const [session, setSession] = useState<ServiceSessionDetail | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

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
      setSessionError(
        code === 'ACCOUNT_BANNED' ? adminMessages.helpBanned : adminErrorText(code),
      );
    } finally {
      setStarting(false);
    }
  };

  const hint =
    session === undefined
      ? adminMessages.supportSessionLoading
      : session === null
        ? adminMessages.supportSessionIdle
        : serviceChatHint(session.status);

  return (
    <main className="support-page">
      <section className="support-hero">
        <span className="support-hero-mark" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 13.5v-1a7.5 7.5 0 0 1 15 0v1" />
            <rect x="3.2" y="12.4" width="3.6" height="6" rx="1.8" />
            <rect x="17.2" y="12.4" width="3.6" height="6" rx="1.8" />
            <path d="M19 18.4v.6a2.4 2.4 0 0 1-2.4 2.4H13" />
          </svg>
        </span>
        <div className="support-hero-main">
          <p className="admin-eyebrow">{adminMessages.supportEyebrow}</p>
          <h1 className="support-title">{adminMessages.supportTitle}</h1>
          <p className="support-subtitle">{adminMessages.supportSubtitle}</p>
          <ul className="support-chips">
            <li>{adminMessages.supportChipHuman}</li>
            <li>{adminMessages.supportChipPrivate}</li>
            <li>{adminMessages.supportChipResume}</li>
          </ul>
        </div>
      </section>

      {token === null ? (
        <Alert
          type="info"
          showIcon
          title={adminMessages.supportLoginRequiredTitle}
          description={adminMessages.supportLoginRequiredBody}
        />
      ) : (
        <div className="support-grid">
          <section className="support-card">
            <header className="support-card-head">
              <div>
                <h2 className="support-card-title">{adminMessages.supportSectionTitle}</h2>
                <p className="support-card-hint">{hint}</p>
              </div>
            </header>

            {sessionError !== null && (
              <Alert
                type="error"
                showIcon
                title={adminMessages.supportServiceFailed}
                description={sessionError}
              />
            )}

            {session === undefined && <Skeleton active paragraph={{ rows: 5 }} />}

            {session === null && (
              <div className="support-empty">
                <span className="support-empty-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 12.4a2.4 2.4 0 0 1-2.4 2.4H8.6L4.6 18V6.4A2.4 2.4 0 0 1 7 4h10.6A2.4 2.4 0 0 1 20 6.4z" />
                    <path d="M8.4 9.2h7.2M8.4 12.4h4.6" />
                  </svg>
                </span>
                <b>{adminMessages.supportEmptyTitle}</b>
                <p>{adminMessages.supportEmptyText}</p>
                <Button type="primary" size="large" loading={starting} onClick={startChat}>
                  {adminMessages.supportStart}
                </Button>
              </div>
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

          <aside className="support-tips" aria-label={adminMessages.supportTipsTitle}>
            <h2 className="support-tips-title">{adminMessages.supportTipsTitle}</h2>
            <ol className="support-tip-list">
              {TIPS.map((tip) => (
                <li className="support-tip" key={tip.title}>
                  <b>{tip.title}</b>
                  <p>{tip.text}</p>
                </li>
              ))}
            </ol>
            <p className="support-note">{adminMessages.supportNote}</p>
          </aside>
        </div>
      )}
    </main>
  );
}
