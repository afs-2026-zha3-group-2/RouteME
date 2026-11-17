import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Popconfirm, Skeleton, message } from 'antd';
import {
  closeServiceSession,
  joinServiceSession,
  loadAdminServiceSession,
} from '../../api';
import { adminMessages } from '../../i18n/adminMessages';
import type { DemoUser, ServiceSessionDetail } from '../../types';
import { AdminLayout } from '../AdminLayout';
import { ServiceStatusBadge } from '../adminBadges';
import { adminErrorText, formatDateTime, isStaleAdminError } from '../adminFormat';
import { ServiceContext } from './ServiceContext';
import { ServiceConversation } from './ServiceConversation';

type PanelProps = {
  token: string;
  currentUser: DemoUser;
  session: ServiceSessionDetail;
  onSessionChange: (session: ServiceSessionDetail) => void;
};

/**
 * 工作台主体：会话头动作 + 消息区 + 用户 / 举报上下文。
 * 列表页宽屏内联与独立详情路由共用同一份实现。
 */
export function ServiceSessionPanel({
  token,
  currentUser,
  session,
  onSessionChange,
}: PanelProps) {
  const [acting, setActing] = useState(false);

  const reloadSession = useCallback(
    () => loadAdminServiceSession(token, session.id),
    [token, session.id],
  );

  const refresh = async () => {
    const next = await reloadSession();
    if (next !== null) {
      onSessionChange(next);
    }
  };

  const handleFailure = (caught: unknown) => {
    const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
    if (isStaleAdminError(code)) {
      message.warning(adminErrorText(code));
      void refresh().catch(() => undefined);
    } else {
      message.error(adminErrorText(code));
    }
  };

  const join = async () => {
    setActing(true);
    try {
      const next = await joinServiceSession(token, session.id);
      onSessionChange(next);
      message.success(adminMessages.serviceJoined);
    } catch (caught: unknown) {
      handleFailure(caught);
    } finally {
      setActing(false);
    }
  };

  const close = async () => {
    setActing(true);
    try {
      const next = await closeServiceSession(token, session.id);
      onSessionChange(next);
    } catch (caught: unknown) {
      handleFailure(caught);
    } finally {
      setActing(false);
    }
  };

  return (
    <section className="admin-service-panel">
      <header className="admin-service-head">
        <div className="admin-service-head-main">
          <div className="admin-service-head-title">
            <b>{session.user.nickname}</b>
            <ServiceStatusBadge status={session.status} />
            <span className="admin-note">#{session.id}</span>
          </div>
          <p className="admin-detail-meta">
            <span>
              {adminMessages.colCreatedAt} {formatDateTime(session.created_at)}
            </span>
            <span>
              {session.message_count} {adminMessages.serviceMessageCount}
            </span>
          </p>
        </div>

        <div className="admin-actions">
          {session.status === 'WAITING' && (
            <Button type="primary" loading={acting} onClick={join}>
              {adminMessages.serviceJoin}
            </Button>
          )}
          {session.status === 'HANDLING' && (
            <Popconfirm
              title={adminMessages.serviceClose}
              okText={adminMessages.confirm}
              cancelText={adminMessages.cancel}
              onConfirm={close}
            >
              <Button danger loading={acting}>
                {adminMessages.serviceClose}
              </Button>
            </Popconfirm>
          )}
        </div>
      </header>

      <div className="admin-service-detail">
        <div className="admin-panel admin-service-conversation">
          <ServiceConversation
            token={token}
            currentUserId={currentUser.id}
            session={session}
            reloadSession={reloadSession}
            onSessionChange={onSessionChange}
            placeholder={adminMessages.serviceInputPlaceholder}
            readOnlyText={adminMessages.serviceReadOnly}
            emptyText={adminMessages.serviceChatEmpty}
            emptyHint={adminMessages.serviceChatEmptyHint}
          />
        </div>
        <ServiceContext session={session} />
      </div>
    </section>
  );
}

type PageProps = {
  token: string;
  currentUser: DemoUser;
  sessionId: number;
};

/** 窄屏独立详情路由（`#/admin/service/{id}`）。 */
export function AdminServiceDetailPage({ token, currentUser, sessionId }: PageProps) {
  const [session, setSession] = useState<ServiceSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminServiceSession(token, sessionId)
      .then((loaded) => {
        if (active) {
          setSession(loaded);
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
  }, [token, sessionId, reloadKey]);

  const backLink = (
    <a className="detail-back" href="#/admin/service">
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
      {adminMessages.tabService}
    </a>
  );

  return (
    <AdminLayout active="service" title={adminMessages.serviceTitle}>
      {backLink}

      {error !== null && (
        <Alert
          type="error"
          showIcon
          title={adminMessages.detailNotFound}
          description={adminErrorText(error)}
          action={
            <Button onClick={() => setReloadKey((previous) => previous + 1)}>
              {adminMessages.retry}
            </Button>
          }
        />
      )}

      {loading && session === null && error === null && (
        <Skeleton active paragraph={{ rows: 8 }} />
      )}

      {session !== null && (
        <ServiceSessionPanel
          token={token}
          currentUser={currentUser}
          session={session}
          onSessionChange={setSession}
        />
      )}
    </AdminLayout>
  );
}