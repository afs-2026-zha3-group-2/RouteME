import { useEffect, useState, type ReactNode } from 'react';
import { loadAdminServiceSessions } from '../api';
import { adminMessages } from '../i18n/adminMessages';
import { useAdminSession } from './AdminSessionContext';

const WAITING_POLL_MS = 5000;

export type AdminTab = 'dashboard' | 'users' | 'reports' | 'service';

const TABS: Array<{ key: AdminTab; label: string; href: string }> = [
  { key: 'dashboard', label: adminMessages.tabDashboard, href: '#/admin' },
  { key: 'users', label: adminMessages.tabUsers, href: '#/admin/users' },
  { key: 'reports', label: adminMessages.tabReports, href: '#/admin/reports' },
  { key: 'service', label: adminMessages.tabService, href: '#/admin/service' },
];

type Props = {
  active: AdminTab;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * 后台页头 + 四个 Tab + 返回前台。后台不新建第二套全局壳，
 * 路由变化只切换本组件内部的内容区。
 */
export function AdminLayout({ active, title, subtitle, children }: Props) {
  const session = useAdminSession();
  const token = session?.token ?? null;
  const [waitingTotal, setWaitingTotal] = useState(0);

  /** 待接入数量：后台任意页都每 5 秒静默拉一次，新会话进来时页签出数字徽标。 */
  useEffect(() => {
    if (token === null) {
      return;
    }
    let alive = true;
    const load = () => {
      if (document.hidden) {
        return;
      }
      loadAdminServiceSessions(token, { status: 'WAITING', page: 1, size: 1 })
        .then((page) => {
          if (alive) {
            setWaitingTotal(page.total);
          }
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, WAITING_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [token]);

  return (
    <main className="admin-page">
      <header className="admin-head">
        <div className="admin-head-main">
          <p className="admin-eyebrow">{adminMessages.title}</p>
          <h1 className="admin-title">{title}</h1>
          {subtitle !== undefined && <p className="admin-subtitle">{subtitle}</p>}
        </div>
        <a className="admin-back" href="#/">
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
          {adminMessages.backToFront}
        </a>
      </header>

      <nav className="admin-tabs" aria-label={adminMessages.title}>
        {TABS.map((tab) => (
          <a
            key={tab.key}
            className={tab.key === active ? 'admin-tab active' : 'admin-tab'}
            href={tab.href}
            aria-current={tab.key === active ? 'page' : undefined}
          >
            {tab.label}
            {tab.key === 'service' && waitingTotal > 0 && (
              <span
                className="admin-tab-badge"
                aria-label={`${waitingTotal} ${adminMessages.serviceWaitingBadgeLabel}`}
                title={`${waitingTotal} ${adminMessages.serviceWaitingBadgeLabel}`}
              >
                {waitingTotal}
              </span>
            )}
          </a>
        ))}
        {/* 帮助与反馈仅内部管理员可见；它复用前台页面样式，所以作为跳转页签。 */}
        <a className="admin-tab" href="#/help">
          {adminMessages.helpTitle}
        </a>
      </nav>

      <div className="admin-body">{children}</div>
    </main>
  );
}