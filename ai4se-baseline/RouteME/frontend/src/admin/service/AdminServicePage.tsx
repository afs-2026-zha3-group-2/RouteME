import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { loadAdminServiceSession, loadAdminServiceSessions } from '../../api';
import { startChatPolling } from '../../chat/chatPolling';
import { adminMessages } from '../../i18n/adminMessages';
import { Avatar } from '../../shell/Avatar';
import { EmptyState } from '../../shell/EmptyState';
import { Pager } from '../../shell/Pager';
import { SoftSelect } from '../../shell/SoftSelect';
import { usePaging } from '../../shell/usePaging';
import type { DemoUser, Page, ServiceSessionDetail, ServiceSessionSummary } from '../../types';
import { AdminLayout } from '../AdminLayout';
import { ServiceStatusBadge } from '../adminBadges';
import { adminErrorText, formatDateTime } from '../adminFormat';
import { ServiceSessionPanel } from './AdminServiceDetailPage';
import { useIsNarrow } from './useIsNarrow';

type Props = {
  token: string;
  currentUser: DemoUser;
};

const STATUS_OPTIONS = [
  { value: '', label: adminMessages.serviceAllStatuses },
  { value: 'WAITING', label: adminMessages.sessionWaiting },
  { value: 'HANDLING', label: adminMessages.sessionHandling },
  { value: 'CLOSED', label: adminMessages.sessionClosed },
];

/** 客服工作台：队列 + 会话 + 上下文三栏；窄屏队列点击跳独立详情路由。 */
export function AdminServicePage({ token, currentUser }: Props) {
  const [status, setStatus] = useState('');
  const { page, size, setPage, setSize } = usePaging(status);
  const [data, setData] = useState<Page<ServiceSessionSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ServiceSessionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [waitingTotal, setWaitingTotal] = useState(0);
  const [unread, setUnread] = useState<Record<number, number>>({});
  const narrow = useIsNarrow();

  /** 会话消息条数基线：轮询时数量增长即视为「有新消息」。 */
  const prevCountsRef = useRef<Map<number, number> | null>(null);
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selectedId;

  const trackUnread = useCallback((items: ServiceSessionSummary[]) => {
    const previous = prevCountsRef.current;
    const next = new Map<number, number>();
    const fresh: Array<[number, number]> = [];
    items.forEach((item) => {
      next.set(item.id, item.message_count);
      if (item.id === selectedRef.current) {
        return;
      }
      const before = previous?.get(item.id);
      if (before === undefined) {
        // 首次建立基线不标未读；之后新出现的会话若已带消息则提醒。
        if (previous !== null && item.message_count > 0 && item.status !== 'CLOSED') {
          fresh.push([item.id, item.message_count]);
        }
        return;
      }
      if (item.message_count > before) {
        fresh.push([item.id, item.message_count - before]);
      }
    });
    prevCountsRef.current = next;
    setUnread((current) => {
      const merged = { ...current };
      fresh.forEach(([id, count]) => {
        merged[id] = (merged[id] ?? 0) + count;
      });
      if (selectedRef.current !== null) {
        delete merged[selectedRef.current];
      }
      return merged;
    });
  }, []);

  /** 最新筛选条件：轮询回调不重建定时器，也能拿到当前页与状态。 */
  const filtersRef = useRef({ status, page, size });
  filtersRef.current = { status, page, size };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminServiceSessions(token, { status, page, size })
      .then((loaded) => {
        if (active) {
          setData(loaded);
          trackUnread(loaded.items);
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
  }, [token, status, page, size, reloadKey, trackUnread]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let active = true;
    setDetailError(null);
    setDetail(null);
    loadAdminServiceSession(token, selectedId)
      .then((loaded) => {
        if (active) {
          setDetail(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setDetailError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
        }
      });
    return () => {
      active = false;
    };
  }, [token, selectedId]);

  const pick = (id: number) => {
    setUnread((current) => {
      if (current[id] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (narrow) {
      window.location.hash = `#/admin/service/${id}`;
      return;
    }
    setSelectedId(id);
  };

  /** 有未读消息的会话置顶；同一分组内保持服务端顺序。 */
  const ordered = useMemo(() => {
    if (data === null) {
      return [];
    }
    return [...data.items].sort(
      (left, right) =>
        Number((unread[right.id] ?? 0) > 0) - Number((unread[left.id] ?? 0) > 0),
    );
  }, [data, unread]);

  /** 队列静默轮询：用户新发的消息 / 新会话不需要手动点「刷新」即可出现。 */
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (document.hidden) {
        return;
      }
      const current = filtersRef.current;
      loadAdminServiceSessions(token, current)
        .then((loaded) => {
          if (alive) {
            setData(loaded);
            trackUnread(loaded.items);
          }
        })
        .catch(() => undefined);
      loadAdminServiceSessions(token, { status: 'WAITING', page: 1, size: 1 })
        .then((page) => {
          if (alive) {
            setWaitingTotal(page.total);
          }
        })
        .catch(() => undefined);
    };
    tick();
    const stop = startChatPolling(tick);
    return () => {
      alive = false;
      stop();
    };
  }, [token, trackUnread]);

  const refreshList = () => {
    setReloadKey((previous) => previous + 1);
    if (selectedId !== null) {
      loadAdminServiceSession(token, selectedId)
        .then(setDetail)
        .catch(() => undefined);
    }
  };

  return (
    <AdminLayout active="service" title={adminMessages.serviceTitle}>
      {waitingTotal > 0 && status !== 'WAITING' && (
        <div className="admin-waiting-banner" role="status">
          <span>
            {adminMessages.serviceWaitingBanner}（{waitingTotal}）
          </span>
          <Button
            size="small"
            onClick={() => {
              setStatus('WAITING');
              setSelectedId(null);
            }}
          >
            {adminMessages.serviceWaitingFilter}
          </Button>
        </div>
      )}

      <div className="admin-toolbar">
        <div className="admin-filter">
          <span className="admin-filter-label">{adminMessages.serviceStatusFilter}</span>
          <SoftSelect
            value={status}
            options={STATUS_OPTIONS}
            onChange={(next) => {
              setStatus(next);
              setSelectedId(null);
            }}
            ariaLabel={adminMessages.serviceStatusFilter}
          />
        </div>
        <Button type="text" onClick={refreshList}>
          {adminMessages.refresh}
        </Button>
      </div>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          title={adminMessages.loadFailed}
          description={adminErrorText(error)}
          action={
            <Button onClick={() => setReloadKey((previous) => previous + 1)}>
              {adminMessages.retry}
            </Button>
          }
        />
      )}

      {error === null && loading && data === null && (
        <Skeleton active paragraph={{ rows: 6 }} />
      )}

      {error === null && data !== null && data.items.length === 0 && !loading && (
        <EmptyState title={adminMessages.serviceEmpty} text={adminMessages.emptyHint} />
      )}

      {error === null && data !== null && data.items.length > 0 && (
        <>
          <div className="admin-service-workspace">
            <div className="admin-queue" aria-label={adminMessages.serviceQueue}>
              {ordered.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={
                    session.id === selectedId ? 'admin-queue-item active' : 'admin-queue-item'
                  }
                  onClick={() => pick(session.id)}
                >
                  <Avatar user={session.user} size="sm" />
                  <span className="admin-queue-main">
                    <span className="admin-queue-title">
                      <b>{session.user.nickname}</b>
                      <span className="admin-note">#{session.id}</span>
                    </span>
                    <span className="admin-queue-meta">
                      <ServiceStatusBadge status={session.status} />
                      <span>
                        {formatDateTime(session.last_message_at ?? session.created_at)}
                      </span>
                    </span>
                  </span>
                  <span className="admin-queue-count">
                    {session.message_count} {adminMessages.serviceMessageCount}
                  </span>
                  {unread[session.id] > 0 && (
                    <span
                      className="admin-queue-bubble"
                      aria-label={`${unread[session.id]} ${adminMessages.serviceUnreadLabel}`}
                      title={`${unread[session.id]} ${adminMessages.serviceUnreadLabel}`}
                    >
                      {unread[session.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="admin-service-live">
              {detailError !== null && (
                <Alert
                  type="error"
                  showIcon
                  title={adminMessages.serviceLoadFailed}
                  description={adminErrorText(detailError)}
                />
              )}
              {detail === null && detailError === null && (
                <EmptyState
                  title={adminMessages.serviceSelectHint}
                  text={adminMessages.emptyHint}
                />
              )}
              {detail !== null && (
                <ServiceSessionPanel
                  key={detail.id}
                  token={token}
                  currentUser={currentUser}
                  session={detail}
                  onSessionChange={setDetail}
                />
              )}
            </div>
          </div>

          <Pager
            page={data.page}
            size={data.size}
            total={data.total}
            totalPages={data.total_pages}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </>
      )}
    </AdminLayout>
  );
}