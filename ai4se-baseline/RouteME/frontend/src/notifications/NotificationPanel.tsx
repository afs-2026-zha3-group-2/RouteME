import { notificationMessages } from '../i18n/notificationMessages';
import { formatChatTime } from '../utils/chatTime';
import type { AppNotification } from '../types';
import { isUnread } from './notificationModel';

type Props = {
  items: AppNotification[];
  total: number;
  loadFailed: boolean;
  onRetry: () => void;
  onMarkAll: () => void;
  onSelect: (item: AppNotification) => void;
  onViewAll: () => void;
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
  onViewAll,
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
          {items.map((item) => {
            const unread = isUnread(item);
            return (
              <button
                key={item.id}
                type="button"
                className={unread ? 'notification-item is-unread' : 'notification-item'}
                data-testid="notification-item"
                data-type={item.type}
                onClick={() => onSelect(item)}
              >
                <span className="notification-item-meta">
                  <span className="notification-item-kind" data-kind={item.type}>
                    {notificationMessages.typeLabel(item.type)}
                  </span>
                  <span>{formatChatTime(item.created_at)}</span>
                  {item.priority === 'HIGH' ? (
                    <span className="notification-priority-flag">
                      {notificationMessages.priorityHigh}
                    </span>
                  ) : null}
                  {unread ? (
                    <span className="notification-unread-flag">{notificationMessages.unread}</span>
                  ) : null}
                </span>
                <span className="notification-item-title">{item.title}</span>
                <span className="notification-item-text">{item.content}</span>
                {item.related_available === false ? (
                  <span className="notification-unavailable">
                    {notificationMessages.unavailable}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="notification-panel-foot">
        <a className="notification-view-all" href="#/notifications" onClick={onViewAll}>
          {notificationMessages.viewAll}
        </a>
      </div>
    </div>
  );
}