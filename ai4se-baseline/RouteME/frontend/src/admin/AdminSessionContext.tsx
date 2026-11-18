import { createContext, useContext, type ReactNode } from 'react';
import type { DemoUser } from '../types';

export type AdminSession = {
  currentUser: DemoUser;
  token: string;
};

const AdminSessionContext = createContext<AdminSession | null>(null);

/** 后台通用页签需要知道当前管理员是谁（如客服待接入数量轮询），由 AdminGuard 注入。 */
export function AdminSessionProvider({
  value,
  children,
}: {
  value: AdminSession;
  children: ReactNode;
}) {
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

/** 非后台页面（或未登录）返回 null。 */
export function useAdminSession(): AdminSession | null {
  return useContext(AdminSessionContext);
}
