import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { message } from 'antd';
import { notificationMessages } from '../i18n/notificationMessages';
import type { AppNotification } from '../types';
import { NotificationBadge } from './NotificationBadge';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from './NotificationContext';
import { notificationAvailable, notificationHref } from './notificationModel';

/** 面板总宽（含内边距）；窄屏改为左右各留 8px 的整行宽度。 */
const PANEL_WIDTH = 384;
const VIEWPORT_MARGIN = 8;
const GAP = 8;
const MIN_HEIGHT = 160;

type Anchor = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

/**
 * 顶栏铃铛：click 展开（不引入 hover 分支），Escape 关闭并把焦点还给按钮。
 * 徽标显示 `counts.total`，数字同时进入 `aria-label`。
 *
 * 面板用 portal 挂到 body、按铃铛的视口矩形定位：顶栏带 backdrop-filter，
 * 会成为 fixed 子元素的定位容器；同时这里不依赖入场动画 —— antd Popover 的
 * `ant-zoom-big-appear-prepare` 在后台标签页里会被 rAF 节流卡在 opacity: 0，
 * 表现为「点了没反应」，和左下角账号菜单一样用纯定位即可。
 */
export function NotificationBell() {
  const { currentUserId, items, counts, loadFailed, markOneRead, markAllRead, reload } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const label =
    counts.total > 0
      ? notificationMessages.bellLabelUnread(counts.total)
      : notificationMessages.bellLabel;

  const placePanel = useCallback(() => {
    const trigger = buttonRef.current;
    if (trigger === null) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const width = viewportWidth <= 680 ? viewportWidth - VIEWPORT_MARGIN * 2 : PANEL_WIDTH;
    const left =
      viewportWidth <= 680
        ? VIEWPORT_MARGIN
        : Math.min(
            Math.max(VIEWPORT_MARGIN, rect.right - width),
            viewportWidth - width - VIEWPORT_MARGIN,
          );
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
    if (spaceBelow >= MIN_HEIGHT || spaceBelow >= spaceAbove) {
      setAnchor({
        left,
        width,
        top: rect.bottom + GAP,
        maxHeight: Math.min(520, Math.max(MIN_HEIGHT, spaceBelow)),
      });
      return;
    }
    setAnchor({
      left,
      width,
      bottom: window.innerHeight - rect.top + GAP,
      maxHeight: Math.min(520, Math.max(MIN_HEIGHT, spaceAbove)),
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  /**
   * 打开时不抢焦点：V2 场景要求「面板打开时新事件只更新列表，不移动焦点」，
   * 铃铛本身已用 `aria-expanded` 表明展开状态；Escape 才把焦点交还铃铛。
   */
  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    placePanel();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', placePanel);
    document.addEventListener('scroll', placePanel, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', placePanel);
      document.removeEventListener('scroll', placePanel, true);
    };
  }, [open, close, placePanel]);

  const selectItem = (item: AppNotification) => {
    markOneRead(item.id);
    if (!notificationAvailable(item)) {
      message.warning(notificationMessages.unavailable);
      return;
    }
    window.location.hash = notificationHref(item, currentUserId);
    setOpen(false);
  };

  const viewAll = () => {
    setOpen(false);
    window.location.hash = '#/notifications';
  };

  const panel = (
    <div
      className="notification-pop"
      ref={panelRef}
      style={{
        left: anchor?.left,
        width: anchor?.width,
        top: anchor?.top,
        bottom: anchor?.bottom,
        maxHeight: anchor?.maxHeight,
      }}
    >
      <NotificationPanel
        items={items}
        total={counts.total}
        loadFailed={loadFailed}
        onRetry={reload}
        onMarkAll={markAllRead}
        onSelect={selectItem}
        onViewAll={viewAll}
      />
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn notification-bell"
        data-testid="notification-bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title={notificationMessages.title}
        onClick={toggle}
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
          <path d="M10 2.8a4.3 4.3 0 0 0-4.3 4.3v2.3L4 12.4h12l-1.7-3V9.4A4.3 4.3 0 0 0 10 2.8Z" />
          <path d="M8.2 15a1.9 1.9 0 0 0 3.6 0" />
        </svg>
        <NotificationBadge count={counts.total} testId="notification-badge" />
      </button>
      {open && anchor !== null && createPortal(panel, document.body)}
    </>
  );
}