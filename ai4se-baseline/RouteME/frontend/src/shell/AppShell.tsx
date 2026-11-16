import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { tripMessages } from '../i18n/tripMessages';
import { publisherSummary } from '../profile/profileDisplay';
import type { Route } from '../route';
import type { ColorMode } from '../theme';
import type { DemoUser } from '../types';
import { Avatar } from './Avatar';
import { BrandMark } from './BrandMark';

type NavKey = 'discover' | 'create' | 'mine';

type NavItem = { key: NavKey; label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'discover', label: tripMessages.homeTitle, href: '#/' },
  { key: 'create', label: tripMessages.publish, href: '#/trips/new' },
  { key: 'mine', label: tripMessages.mineTitle, href: '#/mine' },
];

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  { title: '浏览', items: NAV_ITEMS.filter((item) => item.key === 'discover') },
  { title: '我的', items: NAV_ITEMS.filter((item) => item.key !== 'discover') },
];

function activeKey(route: Route): NavKey | null {
  if (route.name === 'home') {
    return 'discover';
  }
  if (route.name === 'create' || route.name === 'share') {
    return 'create';
  }
  if (route.name === 'mine') {
    return 'mine';
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
  mode: ColorMode;
  onToggleMode: () => void;
  children: ReactNode;
};

export function AppShell({
  currentUser,
  isAuthenticated,
  onLogout,
  route,
  mode,
  onToggleMode,
  children,
}: Props) {
  const active = activeKey(route);
  const [identityOpen, setIdentityOpen] = useState(false);
  const identityRef = useRef<HTMLDivElement>(null);
  const identityTriggerRef = useRef<HTMLButtonElement>(null);

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<{ top: number; left: number } | null>(
    null,
  );
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) {
      setAccountMenuAnchor(null);
      return;
    }
    const placeMenu = () => {
      const trigger = accountTriggerRef.current;
      if (trigger === null) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      setAccountMenuAnchor({ top: rect.bottom, left: rect.right + 10 });
    };
    accountMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountTriggerRef.current?.contains(target) || accountMenuRef.current?.contains(target)) {
        return;
      }
      setAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', placeMenu);
    document.addEventListener('scroll', placeMenu, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', placeMenu);
      document.removeEventListener('scroll', placeMenu, true);
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

  useEffect(() => {
    if (!identityOpen) {
      return;
    }
    const closeOnOutside = (event: MouseEvent) => {
      if (identityRef.current !== null && !identityRef.current.contains(event.target as Node)) {
        setIdentityOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIdentityOpen(false);
        identityTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [identityOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>

      <header className="topbar">
        <a className="brand" href="#/" aria-label="RouteMe 路觅首页">
          <BrandMark />
          <span className="brand-text">
            <b>RouteMe</b>
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

        <div className="id-switch" ref={identityRef}>
          <button
            ref={identityTriggerRef}
            type="button"
            className="id-switch-btn"
            aria-haspopup="dialog"
            aria-expanded={identityOpen}
            aria-label={`${tripMessages.identitySwitch}：当前 ${currentUser.nickname}`}
            onClick={() => setIdentityOpen((previous) => !previous)}
          >
            <Avatar user={currentUser} size="sm" />
            <span className="id-switch-text">
              <span className="id-switch-name">{currentUser.nickname}</span>
              <span className="id-switch-label">{tripMessages.identitySwitch}</span>
            </span>
            <svg
              className="id-switch-caret"
              viewBox="0 0 12 12"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="m3 4.5 3 3 3-3" />
            </svg>
          </button>

          {identityOpen && (
            <div className="id-panel" role="dialog" aria-label="身份菜单">
              {isAuthenticated && (
                <div className="id-current">
                  <Avatar user={currentUser} size="sm" />
                  <span className="id-option-text">
                    <b>{currentUser.nickname}</b>
                    <i>{publisherSummary(currentUser) || tripMessages.profileIncompleteShort}</i>
                  </span>
                  <span className="id-option-flag">{tripMessages.authLoggedIn}</span>
                </div>
              )}
              <div className="id-divider" role="separator" />
              <button
                type="button"
                className="id-logout"
                onClick={() => {
                  setIdentityOpen(false);
                  onLogout();
                }}
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
                  <path d="M12 6.5 15.5 10 12 13.5M8.5 10h7" />
                </svg>
                <span>{tripMessages.authLogout}</span>
              </button>
              <p className="id-panel-note">
                {isAuthenticated
                  ? '退出登录会结束本机会话并回到登录页。'
                  : '退出登录会清除本机身份并回到登录页。'}
              </p>
            </div>
          )}
        </div>
      </header>

      <aside className="rail" aria-label="主导航">
        <nav className="rail-nav">
          {NAV_GROUPS.map((group) => (
            <div className="rail-group" key={group.title}>
              <span className="rail-group-title">{group.title}</span>
              {group.items.map((item) => (
                <a
                  key={item.key}
                  className={active === item.key ? 'rail-link active' : 'rail-link'}
                  href={item.href}
                  aria-current={active === item.key ? 'page' : undefined}
                >
                  <NavIcon name={item.key} />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="rail-foot">
          <button
            ref={accountTriggerRef}
            type="button"
            className="rail-user"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label={`账号：${currentUser.nickname}`}
            title="账号"
            onClick={() => {
              if (accountOpen) {
                setAccountOpen(false);
                return;
              }
              const rect = accountTriggerRef.current?.getBoundingClientRect();
              if (rect !== undefined) {
                setAccountMenuAnchor({ top: rect.bottom, left: rect.right + 10 });
              }
              setAccountOpen(true);
            }}
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

          {accountOpen && accountMenuAnchor !== null && (
            <div
              ref={accountMenuRef}
              className="rail-menu"
              role="menu"
              aria-label="账号菜单"
              style={{ top: accountMenuAnchor.top, left: accountMenuAnchor.left }}
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
            </div>
          )}
        </div>
      </aside>

      <div className="view" id="main-content" tabIndex={-1}>
        {children}
      </div>

      <nav className="tabbar" aria-label="底部导航">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            className={active === item.key ? 'tab-link active' : 'tab-link'}
            href={item.href}
            aria-current={active === item.key ? 'page' : undefined}
          >
            <NavIcon name={item.key} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}