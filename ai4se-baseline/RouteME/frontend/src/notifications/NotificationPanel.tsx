import { notificationMessages } from '../i18n/notificationMessages';
import { formatChatTime } from '../utils/chatTime';
import type { AppNotification } from '../types';

type Props = {
  items: AppNotification[];
  total: number;
  loadFailed: boolean;
  onRetry: () => void;
  onMarkAll: () => void;
  onSelect: (item: AppNotification) => void;
};

/**
 * 通知面板：最新 50 条 + 全部已读 + 空态 / 失败态。
 * 条目点击由上层先标读再直达，面板本身不发请求。
 */
export function NotificationPanel({
  items,
  total,
  loadFailed,
  onRetry,
  onMarkAll,
  onSelect,
}: Props) {
  return (
    <div
      className="notification-panel"
      role="dialog"
      aria-label={notificationMessages.title}
      data-testid="notification-panel"
    >
      <div className="notification-panel-head">
        <span className="notification-panel-title">{notificationMessages.title}</span>
        <button
          type="button"
          className="notification-mark-all"
          data-testid="notification-mark-all"
          disabled={total === 0}
          onClick={onMarkAll}
        >
          {notificationMessages.markAll}
        </button>
      </div>

      {loadFailed && items.length === 0 ? (
        <div className="notification-error" role="alert">
          <span>{notificationMessages.loadFailed}</span>
          <button type="button" className="notification-mark-all" onClick={onRetry}>
            {notificationMessages.retry}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="notification-empty">{notificationMessages.empty}</p>
      ) : (
        <div className="notification-panel-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.read ? 'notification-item' : 'notification-item is-unread'}
              data-testid="notification-item"
              onClick={() => onSelect(item)}
            >
              <span className="notification-item-text">{item.text}</span>
              <span className="notification-item-meta">
                <span>{formatChatTime(item.created_at)}</span>
                {item.read ? null : (
                  <span className="notification-unread-flag">{notificationMessages.unread}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}