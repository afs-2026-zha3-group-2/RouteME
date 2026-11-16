import { useEffect, useRef, useState, type ReactNode } from 'react';
import { tripMessages } from '../i18n/tripMessages';
import { publisherSummary } from '../profile/profileDisplay';
import type { Route } from '../route';
import type { ColorMode } from '../theme';
import type { DemoUser } from '../types';
import { Avatar } from './Avatar';

type NavKey = 'discover' | 'create' | 'mine';

const NAV_ITEMS: Array<{ key: NavKey; label: string; href: string }> = [
  { key: 'discover', label: tripMessages.homeTitle, href: '#/' },
  { key: 'create', label: tripMessages.publish, href: '#/trips/new' },
  { key: 'mine', label: tripMessages.mineTitle, href: '#/mine' },
];

const LOOP_STEPS = ['旅行灵感', '发布行程', '发现同行者', '建立连接', '一起旅行', '分享体验'];

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

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path
          d="M5 24c5-13 17-13 22 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="16" cy="10" r="3.4" fill="currentColor" />
      </svg>
    </span>
  );
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
  demoUsers: DemoUser[];
  isAuthenticated: boolean;
  onLogout: () => void;
  route: Route;
  mode: ColorMode;
  onToggleMode: () => void;
  onSelectUser: (user: DemoUser) => void;
  children: ReactNode;
};

export function AppShell({
  currentUser,
  demoUsers,
  isAuthenticated,
  onLogout,
  route,
  mode,
  onToggleMode,
  onSelectUser,
  children,
}: Props) {
  const active = activeKey(route);
  const [identityOpen, setIdentityOpen] = useState(false);
  const identityRef = useRef<HTMLDivElement>(null);
  const identityTriggerRef = useRef<HTMLButtonElement>(null);

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
              <p className="id-panel-label" id="identity-options-label">
                {isAuthenticated ? '切换为演示身份' : tripMessages.identityTitle}
              </p>
              <div className="id-list" role="listbox" aria-labelledby="identity-options-label">
                {demoUsers.map((user) => {
                  const selected = !isAuthenticated && user.id === currentUser.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={selected ? 'id-option on' : 'id-option'}
                      onClick={() => {
                        onSelectUser(user);
                        setIdentityOpen(false);
                      }}
                    >
                      <Avatar user={user} size="sm" />
                      <span className="id-option-text">
                        <b>{user.nickname}</b>
                        <i>{publisherSummary(user) || tripMessages.profileIncompleteShort}</i>
                      </span>
                      {selected && <span className="id-option-flag">当前</span>}
                    </button>
                  );
                })}
              </div>
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
                  ? '退出登录会结束本机会话并回到身份门；切换到演示身份会结束当前登录。'
                  : '演示身份无需密码；退出登录只清除本机身份并回到身份门。'}
              </p>
            </div>
          )}
        </div>
      </header>

      <aside className="rail" aria-label="主导航">
        <nav className="rail-nav">
          {NAV_ITEMS.map((item) => (
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
        </nav>

        <div className="rail-foot">
          <div className="rail-loop">
            <span className="rail-loop-title">价值闭环</span>
            <ol>
              {LOOP_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <p className="rail-note">演示环境 · 数据保存在本机</p>
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