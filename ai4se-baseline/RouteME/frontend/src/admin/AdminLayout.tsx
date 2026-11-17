import type { ReactNode } from 'react';
import { adminMessages } from '../i18n/adminMessages';

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
          </a>
        ))}
      </nav>

      <div className="admin-body">{children}</div>
    </main>
  );
}