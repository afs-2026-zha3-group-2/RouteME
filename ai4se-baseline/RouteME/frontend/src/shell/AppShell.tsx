import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { loadUserProfile } from '../api';
import { useMyCredit } from '../credit/CreditContext';
import { CreditRestrictionGate } from '../credit/CreditRestrictionGate';
import { adminMessages } from '../i18n/adminMessages';
import { financeMessages } from '../i18n/financeMessages';
import { notificationMessages } from '../i18n/notificationMessages';
import { GateScene } from '../identity/GateScene';
import { tripMessages } from '../i18n/tripMessages';
import { NotificationBadge } from '../notifications/NotificationBadge';
import { NotificationBell } from '../notifications/NotificationBell';
import { useNotifications } from '../notifications/NotificationContext';
import { railBadgeCounts } from '../notifications/notificationModel';
import { AccountStatusBanner } from '../profile/AccountStatusBanner';
import { publisherSummary } from '../profile/profileDisplay';
import type { Route } from '../route';
import type { DemoUser, UserProfile } from '../types';
import { Avatar } from './Avatar';
import { BrandMark } from './BrandMark';

type NavKey = 'discover' | 'create' | 'aiPlanner' | 'mine' | 'finance' | 'chat' | 'support' | 'admin';

type NavItem = { key: NavKey; label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'discover', label: tripMessages.homeTitle, href: '#/' },
  { key: 'create', label: tripMessages.publish, href: '#/trips/new' },
  { key: 'aiPlanner', label: 'AI 规划', href: '#/ai-planner' },
  { key: 'mine', label: tripMessages.mineTitle, href: '#/mine' },
  { key: 'finance', label: financeMessages.navEntry, href: '#/finance' },
  { key: 'chat', label: tripMessages.chatNav, href: '#/chat' },
];

// 客服是用户侧独立入口；帮助与反馈只在管理组里对内部管理员可见。
const SUPPORT_ITEM: NavItem = { key: 'support', label: adminMessages.supportNav, href: '#/support' };

// 侧栏比底部导航多一个客服入口：窄屏改用悬浮入口与账号菜单进入，避免底栏挤成 7 项。
// 通知中心不占侧栏位置：从铃铛面板的「查看全部通知」与账号菜单进入。
const RAIL_ITEMS: NavItem[] = [
  ...NAV_ITEMS,
  SUPPORT_ITEM,
];

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  { title: '浏览', items: RAIL_ITEMS.filter((item) => item.key === 'discover') },
  { title: '规划', items: RAIL_ITEMS.filter((item) => item.key === 'create' || item.key === 'aiPlanner') },
  { title: '我的', items: RAIL_ITEMS.filter((item) => item.key === 'mine' || item.key === 'finance' || item.key === 'chat' || item.key === 'support') },
];

function activeKey(route: Route): NavKey | null {
  if (route.name === 'home') {
    return 'discover';
  }
  if (route.name === 'create' || route.name === 'share') {
    return 'create';
  }
  if (route.name === 'aiPlanner') {
    return 'aiPlanner';
  }
  if (route.name === 'mine') {
    return 'mine';
  }
  if (route.name === 'finance' || route.name === 'tripFinance') {
    return 'finance';
  }
  if (route.name === 'chat') {
    return 'chat';
  }
  if (route.name === 'support') {
    return 'support';
  }
  if (route.name.startsWith('admin')) {
    return 'admin';
  }
  return null;
}

function NavIcon({ name }: { name: NavKey }) {
  if (name === 'discover') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="10" cy="10" r="7" />
        <path d="m12.8 7.2-1.5 4.1-4.1 1.5 1.5-4.1z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'create') {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <path d="M10 4.5v11M4.5 10h11" />
      </svg>
    );
  }
  if (name === 'aiPlanner') {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 3.2 11.6 8l4.8 1.6-4.8 1.6L10 16l-1.6-4.8L3.6 9.6 8.4 8Z" />
        <path d="M15.6 3v3M14.1 4.5h3" />
      </svg>
    );
  }
  if (name === 'finance') {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h8.5A2 2 0 0 1 16.5 7v7a2 2 0 0 1-2 2H6a2.5 2.5 0 0 1-2.5-2.5z" />
        <path d="M3.5 8.5h13M13.2 12h.9" />
      </svg>
    );
  }
  if (name === 'chat') {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      >
        <path d="M17 11.4a2 2 0 0 1-2 2H7l-3.4 2.6V5a2 2 0 0 1 2-2h9.4a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (name === 'support') {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.8 11.4a6.2 6.2 0 0 1 12.4 0" />
        <rect x="2.8" y="10.6" width="3.1" height="5" rx="1.5" />
        <rect x="14.1" y="10.6" width="3.1" height="5" rx="1.5" />
        <path d="M15.6 15.6v.5a2 2 0 0 1-2 2h-2.4" />
      </svg>
    );
  }
  if (name === 'admin') {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 2.8 16.4 5v5.1c0 3.4-2.5 5.8-6.4 7.1-3.9-1.3-6.4-3.7-6.4-7.1V5z" />
        <path d="m7.3 10 1.9 1.9 3.6-3.8" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 15.5c3.6 0 5.6-2.2 6.4-6.6l3.4-1.4-1.4 3.4C9 13.2 6.8 15.2 5 15.5Z" />
      <circle cx="6" cy="6" r="1.6" />
      <circle cx="14" cy="14" r="1.6" />
    </svg>
  );
}

type Props = {
  currentUser: DemoUser;
  isAuthenticated: boolean;
  onLogout: () => void;
  route: Route;
  children: ReactNode;
};

export function AppShell({
  currentUser,
  isAuthenticated,
  onLogout,
  route,
  children,
}: Props) {
  const active = activeKey(route);
  const { counts } = useNotifications();
  /**
   * 侧栏按功能分摊未读数：行程与同行申请归「我的旅行」，聊天归「同行消息」，
   * 客服归「联系客服」，其余（信用分 / 举报 / 账号 / 系统）归账号。
   * 四项之和恒等于未读总数，与铃铛徽标一致。
   */
  const railBadges = railBadgeCounts(counts);
  const railBadgeOf = (key: NavKey): number => {
    if (key === 'mine') {
      return railBadges.trips;
    }
    if (key === 'chat') {
      return railBadges.chat;
    }
    if (key === 'support') {
      return railBadges.support;
    }
    return 0;
  };
  const isAdmin = currentUser.role === 'ADMIN';
  /** 管理员只保留浏览 / 规划 / 发布与后台入口；我的旅行、同行消息、联系客服不向管理员展示。 */
  const hiddenForAdmin: NavKey[] = ['mine', 'chat', 'support'];
  const { restricted } = useMyCredit();


  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<{
    left: number;
    bottom: number;
    placement: 'rail' | 'tabbar';
  } | null>(null);
  const railAccountRef = useRef<HTMLButtonElement>(null);
  const tabAccountRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  /** 宽屏用侧栏底部入口，窄屏侧栏隐藏后改用底部导航入口，菜单跟随可见的那一个。 */
  const visibleAccountTrigger = () => {
    const railTrigger = railAccountRef.current;
    if (railTrigger !== null && railTrigger.offsetParent !== null) {
      return railTrigger;
    }
    return tabAccountRef.current;
  };

  /**
   * 账号菜单固定浮在入口旁边：`.rail` 带 backdrop-filter，会成为 fixed 子元素的定位
   * 容器，所以菜单用 portal 挂到 body，坐标按视口计算。窄屏的入口在底部导航里，
   * 菜单位于导航上方并夹在视口内。
   */
  const placeAccountMenu = () => {
    const trigger = visibleAccountTrigger();
    if (trigger === null) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    if (trigger.closest('.tabbar') !== null) {
      // 与 `.rail-menu` 的宽度和视口留白保持一致。
      const menuWidth = 188;
      const margin = 12;
      setAccountMenuAnchor({
        left: Math.min(
          Math.max(margin, rect.left + rect.width / 2 - menuWidth / 2),
          window.innerWidth - menuWidth - margin,
        ),
        bottom: window.innerHeight - rect.top + 10,
        placement: 'tabbar',
      });
      return;
    }
    const railRight = trigger.closest('.rail')?.getBoundingClientRect().right ?? rect.right;
    setAccountMenuAnchor({
      left: railRight + 12,
      bottom: Math.max(12, window.innerHeight - rect.bottom),
      placement: 'rail',
    });
  };

  const toggleAccountMenu = () => {
    if (accountOpen) {
      setAccountOpen(false);
      return;
    }
    placeAccountMenu();
    setAccountOpen(true);
  };

  // 受限账号（BANNED / SUSPENDED）在任意页面都要先看到处罚说明；理由与解封时间只在本人资料接口下发。
  const [selfProfile, setSelfProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (currentUser.status !== 'BANNED' && currentUser.status !== 'SUSPENDED') {
      setSelfProfile(null);
      return;
    }
    let active = true;
    loadUserProfile(currentUser.id, currentUser.id)
      .then((profile) => {
        if (active) {
          setSelfProfile(profile);
        }
      })
      .catch(() => {
        // 读不到完整资料时仍按会话里的 status 给出提示，理由显示占位符。
        if (active) {
          setSelfProfile(null);
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id, currentUser.status]);

  useEffect(() => {
    if (!accountOpen) {
      setAccountMenuAnchor(null);
      return;
    }
    placeAccountMenu();
    accountMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        railAccountRef.current?.contains(target) ||
        tabAccountRef.current?.contains(target) ||
        accountMenuRef.current?.contains(target)
      ) {
        return;
      }
      setAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        visibleAccountTrigger()?.focus();
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', placeAccountMenu);
    document.addEventListener('scroll', placeAccountMenu, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', placeAccountMenu);
      document.removeEventListener('scroll', placeAccountMenu, true);
    };
  }, [accountOpen]);

  const moveAccountMenuFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    if (items.length === 0) {
      return;
    }
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const offset = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + offset + items.length) % items.length].focus();
  };

  return (
    <div className="app-shell">
      <div className="app-backdrop" aria-hidden="true">
        <GateScene />
      </div>

      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>

      <header className="topbar">
        <a className="brand" href="#/" aria-label="RouteMe 路觅首页">
          <BrandMark />
          <span className="brand-text">
            <b>
              Route<span className="brand-me">Me</span>
            </b>
            <i>路觅</i>
          </span>
        </a>

        <span className="topbar-spacer" />

        <NotificationBell />
      </header>

      <aside className="rail" aria-label="主导航">
        <nav className="rail-nav">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(
              (item) => !isAdmin || !hiddenForAdmin.includes(item.key),
            );
            if (items.length === 0) {
              return null;
            }
            return (
              <div className="rail-group" key={group.title}>
                <span className="rail-group-title">{group.title}</span>
                {items.map((item) => (
                  <a
                    key={item.key}
                    className={active === item.key ? 'rail-link active' : 'rail-link'}
                    href={item.href}
                    aria-current={active === item.key ? 'page' : undefined}
                    aria-label={
                      railBadgeOf(item.key) > 0
                        ? item.key === 'chat'
                          ? notificationMessages.chatUnreadLabel(railBadges.chat)
                          : notificationMessages.entryUnread(item.label, railBadgeOf(item.key))
                        : undefined
                    }
                  >
                    <NavIcon name={item.key} />
                    <span>{item.label}</span>
                    {item.key === 'chat' ? (
                      <NotificationBadge count={railBadges.chat} testId="rail-chat-badge" />
                    ) : item.key === 'mine' ? (
                      <NotificationBadge count={railBadges.trips} testId="rail-trips-badge" />
                    ) : item.key === 'support' ? (
                      <NotificationBadge count={railBadges.support} testId="rail-support-badge" />
                    ) : null}
                  </a>
                ))}
              </div>
            );
          })}
          {currentUser.role === 'ADMIN' && (
            <div className="rail-group">
              <span className="rail-group-title">管理</span>
              <a
                className={active === 'admin' ? 'rail-link active' : 'rail-link'}
                href="#/admin"
                aria-current={active === 'admin' ? 'page' : undefined}
              >
                <NavIcon name="admin" />
                <span>{adminMessages.title}</span>
              </a>
            </div>
          )}
        </nav>

        <div className="rail-foot">
          <button
            ref={railAccountRef}
            type="button"
            className="rail-user"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label={
              railBadges.account > 0
                ? `账号：${currentUser.nickname}，${railBadges.account} 条未读`
                : `账号：${currentUser.nickname}`
            }
            title="账号"
            onClick={toggleAccountMenu}
          >
            <Avatar user={currentUser} size="sm" />
            <NotificationBadge
              count={railBadges.account}
              testId="rail-account-badge"
              className="rail-user-badge"
            />
            <span className="rail-user-text">
              <b>{currentUser.nickname}</b>
              <i>{publisherSummary(currentUser) || tripMessages.profileIncompleteShort}</i>
            </span>
            <svg className="rail-user-caret" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="m4.5 3 3 3-3 3" />
            </svg>
          </button>

          {accountOpen &&
            accountMenuAnchor !== null &&
            createPortal(
              <div
                ref={accountMenuRef}
                className={
                  accountMenuAnchor.placement === 'tabbar'
                    ? 'rail-menu tabbar-menu'
                    : 'rail-menu'
                }
                role="menu"
                aria-label="账号菜单"
                style={{ left: accountMenuAnchor.left, bottom: accountMenuAnchor.bottom }}
                onKeyDown={moveAccountMenuFocus}
              >
                <a
                  className="rail-menu-item"
                  role="menuitem"
                  href="#/notifications"
                  aria-label={
                    counts.total > 0
                      ? notificationMessages.centerEntryUnread(counts.total)
                      : notificationMessages.centerEntry
                  }
                  onClick={() => setAccountOpen(false)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2.8a4.3 4.3 0 0 0-4.3 4.3v2.3L4 12.4h12l-1.7-3V9.4A4.3 4.3 0 0 0 10 2.8Z" />
                    <path d="M8.2 15a1.9 1.9 0 0 0 3.6 0" />
                  </svg>
                  <span>{notificationMessages.centerEntry}</span>
                  <NotificationBadge count={counts.total} testId="account-notification-badge" />
                </a>
                {!isAdmin && (
                  <a
                    className="rail-menu-item"
                    role="menuitem"
                    href="#/support"
                    onClick={() => setAccountOpen(false)}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.8 11.4a6.2 6.2 0 0 1 12.4 0" />
                      <rect x="2.8" y="10.6" width="3.1" height="5" rx="1.5" />
                      <rect x="14.1" y="10.6" width="3.1" height="5" rx="1.5" />
                    </svg>
                    <span>{adminMessages.supportNav}</span>
                  </a>
                )}
                <a
                  className="rail-menu-item"
                  role="menuitem"
                  href="#/profile/setup"
                  onClick={() => setAccountOpen(false)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.4 3.6a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3l-8 8-3.4.7.7-3.4z" />
                    <path d="M11.6 5.4 14 7.8" />
                  </svg>
                  <span>
                    {isAuthenticated
                      ? tripMessages.accountMenuEditProfile
                      : tripMessages.accountMenuViewProfile}
                  </span>
                </a>
                <a
                  className="rail-menu-item"
                  role="menuitem"
                  href="#/finance"
                  onClick={() => setAccountOpen(false)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h8.5A2 2 0 0 1 16.5 7v7a2 2 0 0 1-2 2H6a2.5 2.5 0 0 1-2.5-2.5z" />
                    <path d="M3.5 8.5h13M13.2 12h.9" />
                  </svg>
                  <span>{financeMessages.navEntry}</span>
                </a>
                <div className="rail-menu-sep" role="separator" />
                <button
                  type="button"
                  className="rail-menu-item danger"
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    onLogout();
                  }}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.5 3.5H15a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-1.5" />
                    <path d="M9 6.5 12.5 10 9 13.5M12 10H3.5" />
                  </svg>
                  <span>{tripMessages.authLogout}</span>
                </button>
              </div>,
              document.body,
            )}
        </div>
      </aside>

      <div className="view" id="main-content" tabIndex={-1}>
        <AccountStatusBanner
          status={selfProfile?.status ?? currentUser.status}
          banReasonCode={selfProfile?.ban_reason_code}
          banExpiresAt={selfProfile?.ban_expires_at}
          className="view-status-notice"
        />
        {restricted && route.name !== 'creditLearning' ? <CreditRestrictionGate /> : children}
      </div>

      <nav className="tabbar" aria-label="底部导航">
        {NAV_ITEMS.filter(
          (item) =>
            item.key !== 'aiPlanner' &&
            item.key !== 'finance' &&
            !(isAdmin && (item.key === 'mine' || item.key === 'chat')),
        ).map((item) => (
          <a
            key={item.key}
            className={active === item.key ? 'tab-link active' : 'tab-link'}
            href={item.href}
            aria-current={active === item.key ? 'page' : undefined}
            aria-label={
              item.key === 'chat' && counts.by_type.CHAT > 0
                ? notificationMessages.chatUnreadLabel(counts.by_type.CHAT)
                : undefined
            }
          >
            <NavIcon name={item.key} />
            <span>{item.label}</span>
            {item.key === 'chat' ? (
              <NotificationBadge count={counts.by_type.CHAT} testId="tab-chat-badge" />
            ) : null}
          </a>
        ))}
        {currentUser.role === 'ADMIN' && (
          <a
            className={active === 'admin' ? 'tab-link active' : 'tab-link'}
            href="#/admin"
            aria-current={active === 'admin' ? 'page' : undefined}
          >
            <NavIcon name="admin" />
            <span>{adminMessages.title}</span>
          </a>
        )}
        <button
          ref={tabAccountRef}
          type="button"
          className="tab-link tab-account"
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          aria-label={`账号：${currentUser.nickname}`}
          title="账号"
          onClick={toggleAccountMenu}
        >
          <Avatar user={currentUser} size="sm" />
          <span>账号</span>
        </button>
      </nav>

      {/* 窄屏没有侧栏：客服单独做一个悬浮入口，不挤底部导航。管理员不展示客服入口。 */}
      {!isAdmin && route.name !== 'support' && (
        <a className="support-fab" href="#/support" aria-label={adminMessages.supportNav}>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.8 11.4a6.2 6.2 0 0 1 12.4 0" />
            <rect x="2.8" y="10.6" width="3.1" height="5" rx="1.5" />
            <rect x="14.1" y="10.6" width="3.1" height="5" rx="1.5" />
            <path d="M15.6 15.6v.5a2 2 0 0 1-2 2h-2.4" />
          </svg>
          <span>{adminMessages.supportNav}</span>
        </a>
      )}
    </div>
  );
}