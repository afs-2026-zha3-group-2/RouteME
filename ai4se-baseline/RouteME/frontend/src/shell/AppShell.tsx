import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { loadUserProfile } from '../api';
import { useMyCredit } from '../credit/CreditContext';
import { adminMessages } from '../i18n/adminMessages';
import { GateScene } from '../identity/GateScene';
import { tripMessages } from '../i18n/tripMessages';
import { AccountStatusBanner } from '../profile/AccountStatusBanner';
import { creditRestrictedActionMessage } from '../profile/creditDisplay';
import { publisherSummary } from '../profile/profileDisplay';
import type { Route } from '../route';
import type { ColorMode } from '../theme';
import type { DemoUser, UserProfile } from '../types';
import { Avatar } from './Avatar';
import { BrandMark } from './BrandMark';

type NavKey = 'discover' | 'map' | 'create' | 'mine' | 'chat' | 'help' | 'admin';

type NavItem = { key: NavKey; label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'discover', label: tripMessages.homeTitle, href: '#/' },
  { key: 'map', label: '旅行地图', href: '#/map' },
  { key: 'create', label: tripMessages.publish, href: '#/trips/new' },
  { key: 'mine', label: tripMessages.mineTitle, href: '#/mine' },
  { key: 'chat', label: tripMessages.chatNav, href: '#/chat' },
];

// 侧栏比底部导航多一个入口：客服与举报在移动端仍可从账号菜单进入，避免底栏挤成 7 项。
const RAIL_ITEMS: NavItem[] = [
  ...NAV_ITEMS,
  { key: 'help', label: adminMessages.helpTitle, href: '#/help' },
];

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  { title: '浏览', items: RAIL_ITEMS.filter((item) => item.key === 'discover' || item.key === 'map') },
  { title: '我的', items: RAIL_ITEMS.filter((item) => item.key !== 'discover' && item.key !== 'map') },
];

function activeKey(route: Route): NavKey | null {
  if (route.name === 'home') {
    return 'discover';
  }
  if (route.name === 'map') {
    return 'map';
  }
  if (route.name === 'create' || route.name === 'share') {
    return 'create';
  }
  if (route.name === 'mine') {
    return 'mine';
  }
  if (route.name === 'chat') {
    return 'chat';
  }
  if (route.name === 'help') {
    return 'help';
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
  if (name === 'map') {
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
        <path d="M3 5.5 7.5 4l5 1.5L17 4v10.5L12.5 16l-5-1.5L3 16Z" />
        <path d="M7.5 4v10.5M12.5 5.5V16" />
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
  if (name === 'help') {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        <circle cx="10" cy="10" r="7" />
        <path d="M7.8 7.6a2.4 2.4 0 1 1 3.4 2.5c-.7.4-1.2.9-1.2 1.9" />
        <circle cx="10" cy="14.4" r=".9" fill="currentColor" stroke="none" />
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
  onLogout: () => void;
  route: Route;
  mode: ColorMode;
  onToggleMode: () => void;
  children: ReactNode;
};

export function AppShell({
  currentUser,
  onLogout,
  route,
  mode,
  onToggleMode,
  children,
}: Props) {
  const active = activeKey(route);
  const { restricted } = useMyCredit();
  const navBlockedTitle = (item: NavItem) =>
    restricted && item.key === 'create' ? creditRestrictedActionMessage() : undefined;


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

        <button
          type="button"
          className="icon-btn theme-toggle"
          onClick={onToggleMode}
          aria-label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          aria-pressed={mode === 'dark'}
          title={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {mode === 'dark' ? (
            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="10" cy="10" r="4" />
              <path
                d="M10 1.6v2.2M10 16.2v2.2M1.6 10h2.2M16.2 10h2.2M4.1 4.1l1.6 1.6M14.3 14.3l1.6 1.6M15.9 4.1l-1.6 1.6M5.7 14.3l-1.6 1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            >
              <path d="M16 12.4A6.8 6.8 0 0 1 7.6 4a6.9 6.9 0 1 0 8.4 8.4Z" />
            </svg>
          )}
        </button>
      </header>

      <aside className="rail" aria-label="主导航">
        <nav className="rail-nav">
          {NAV_GROUPS.map((group) => (
            <div className="rail-group" key={group.title}>
              <span className="rail-group-title">{group.title}</span>
              {group.items.map((item) => (
                <a
                  key={item.key}
                  className={[
                    active === item.key ? 'rail-link active' : 'rail-link',
                    navBlockedTitle(item) !== undefined ? 'is-disabled' : '',
                  ]
                    .filter((name) => name !== '')
                    .join(' ')}
                  href={item.href}
                  aria-current={active === item.key ? 'page' : undefined}
                  aria-disabled={navBlockedTitle(item) !== undefined || undefined}
                  title={navBlockedTitle(item)}
                  onClick={(event) => {
                    if (navBlockedTitle(item) !== undefined) {
                      event.preventDefault();
                    }
                  }}
                >
                  <NavIcon name={item.key} />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          ))}
          {currentUser.role === 'ADMIN' && (
            <div className="rail-group">
              <span className="rail-group-title">管理</span>
              <a
                className={active === 'admin' ? 'rail-link active' : 'rail-link'}
                href="#/admin/users"
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
            aria-label={`账号：${currentUser.nickname}`}
            title="账号"
            onClick={toggleAccountMenu}
          >
            <Avatar user={currentUser} size="sm" />
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
                  href="#/profile/setup"
                  onClick={() => setAccountOpen(false)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.4 3.6a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3l-8 8-3.4.7.7-3.4z" />
                    <path d="M11.6 5.4 14 7.8" />
                  </svg>
                  <span>编辑我的资料</span>
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
        {children}
      </div>

      <nav className="tabbar" aria-label="底部导航">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            className={[
              active === item.key ? 'tab-link active' : 'tab-link',
              navBlockedTitle(item) !== undefined ? 'is-disabled' : '',
            ]
              .filter((name) => name !== '')
              .join(' ')}
            href={item.href}
            aria-current={active === item.key ? 'page' : undefined}
            aria-disabled={navBlockedTitle(item) !== undefined || undefined}
            title={navBlockedTitle(item)}
            onClick={(event) => {
              if (navBlockedTitle(item) !== undefined) {
                event.preventDefault();
              }
            }}
          >
            <NavIcon name={item.key} />
            <span>{item.label}</span>
          </a>
        ))}
        {currentUser.role === 'ADMIN' && (
          <a
            className={active === 'admin' ? 'tab-link active' : 'tab-link'}
            href="#/admin/users"
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
    </div>
  );
}