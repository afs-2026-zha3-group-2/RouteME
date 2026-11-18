import type { ReactNode } from 'react';
import { adminMessages } from '../i18n/adminMessages';
import type { DemoUser } from '../types';
import { AdminSessionProvider } from './AdminSessionContext';

type Props = {
  currentUser: DemoUser;
  token: string | null;
  children: (token: string) => ReactNode;
};

/**
 * 前端角色兜底（不是安全边界）：非管理员或没有会话 token 时不渲染后台内容，
 * 也不发起任何 `/api/admin/**` 请求；服务端仍会独立校验 `role=ADMIN`。
 */
export function AdminGuard({ currentUser, token, children }: Props) {
  if (currentUser.role !== 'ADMIN' || token === null) {
    return (
      <main className="admin-page">
        <section className="admin-forbidden" role="alert">
          <span className="admin-forbidden-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </svg>
          </span>
          <h1 className="admin-forbidden-title">{adminMessages.forbiddenTitle}</h1>
          <p className="admin-forbidden-text">{adminMessages.forbiddenBody}</p>
          <a className="btn-ghost" href="#/">
            {adminMessages.backHome}
          </a>
        </section>
      </main>
    );
  }
  return (
    <AdminSessionProvider value={{ currentUser, token }}>
      {children(token)}
    </AdminSessionProvider>
  );
}