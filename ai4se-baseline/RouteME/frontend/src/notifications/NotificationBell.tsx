import { useCallback, useEffect, useRef, useState } from 'react';
import { Popover } from 'antd';
import { notificationMessages } from '../i18n/notificationMessages';
import type { AppNotification } from '../types';
import { NotificationBadge } from './NotificationBadge';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from './NotificationContext';
import { notificationHref } from './notificationModel';

/**
 * 顶栏铃铛：click 展开（不引入 hover 分支），Escape 关闭并把焦点还给按钮。
 * 徽标显示 `counts.total`，数字同时进入 `aria-label`。
 */
export function NotificationBell() {
  const { items, counts, loadFailed, markOneRead, markAllRead, reload } = useNotifications();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label =
    counts.total > 0
      ? notificationMessages.bellLabelUnread(counts.total)
      : notificationMessages.bellLabel;

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const selectItem = (item: AppNotification) => {
    markOneRead(item.id);
    window.location.hash = notificationHref(item);
    setOpen(false);
  };

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      arrow={false}
      open={open}
      onOpenChange={setOpen}
      content={
        <NotificationPanel
          items={items}
          total={counts.total}
          loadFailed={loadFailed}
          onRetry={reload}
          onMarkAll={markAllRead}
          onSelect={selectItem}
        />
      }
    >
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn notification-bell"
        data-testid="notification-bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title={notificationMessages.title}
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
    </Popover>
  );
}