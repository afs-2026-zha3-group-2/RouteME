import { useMemo, useState } from 'react';
import { message } from 'antd';
import { notificationMessages } from '../i18n/notificationMessages';
import { NOTIFICATION_TYPES, type AppNotification, type NotificationType } from '../types';
import { formatChatTime } from '../utils/chatTime';
import { useNotifications } from './NotificationContext';
import {
  isUnread,
  notificationAvailable,
  notificationHref,
  typeCount,
} from './notificationModel';

type Filter = NotificationType | 'ALL';

/**
 * 通知中心：八类通知的完整列表 + 按类型筛选 + 一键全部已读。
 *
 * <p>列表与铃铛面板共用同一份状态；打开一条通知即标读，READ 不再计入未读。
 * 关联业务已不可访问时保留正文并提示「相关内容当前不可查看」，不跳转、不报错。</p>
 */
export function NotificationCenterPage() {
  const { currentUserId, items, counts, markOneRead, markAllRead, loadFailed, reload } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>('ALL');

  const visible = useMemo(
    () => (filter === 'ALL' ? items : items.filter((item) => item.type === filter)),
    [items, filter],
  );

  const openItem = (item: AppNotification) => {
    markOneRead(item.id);
    if (!notificationAvailable(item)) {
      message.warning(notificationMessages.unavailable);
      return;
    }
    window.location.hash = notificationHref(item, currentUserId);
  };

  return (
    <main className="trip-page notification-center" data-testid="notification-center">
      <header className="notification-center-head">
        <div>
          <h1 className="page-title">{notificationMessages.centerTitle}</h1>
          <p className="notification-center-sub">
            {counts.total > 0
              ? notificationMessages.unreadTotal(counts.total)
              : notificationMessages.allRead}
            。通知不会因业务状态变化而删除。
          </p>
        </div>
        <button
          type="button"
          className="notification-center-mark-all"
          data-testid="notification-center-mark-all"
          disabled={counts.total === 0}
          onClick={markAllRead}
        >
          {notificationMessages.markAll}
        </button>
      </header>

      <div className="notification-filters" role="tablist" aria-label={notificationMessages.centerTitle}>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'ALL'}
          className={filter === 'ALL' ? 'notification-filter is-active' : 'notification-filter'}
          data-testid="notification-filter-ALL"
          onClick={() => setFilter('ALL')}
        >
          <span>{notificationMessages.allTypes}</span>
          <span className="notification-filter-count">{counts.total}</span>
        </button>
        {NOTIFICATION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={filter === type}
            className={filter === type ? 'notification-filter is-active' : 'notification-filter'}
            data-testid={`notification-filter-${type}`}
            onClick={() => setFilter(type)}
          >
            <span>{notificationMessages.typeLabel(type)}</span>
            <span className="notification-filter-count">{typeCount(counts, type)}</span>
          </button>
        ))}
      </div>

      {loadFailed && items.length === 0 ? (
        <div className="notification-center-error" role="alert">
          <span>{notificationMessages.loadFailed}</span>
          <button type="button" className="notification-center-mark-all" onClick={reload}>
            {notificationMessages.retry}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="notification-center-empty" data-testid="notification-center-empty">
          {filter === 'ALL'
            ? notificationMessages.empty
            : notificationMessages.emptyOfType(notificationMessages.typeLabel(filter))}
        </p>
      ) : (
        <ul className="notification-center-list">
          {visible.map((item) => {
            const unread = isUnread(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={unread ? 'notification-row is-unread' : 'notification-row'}
                  data-testid="notification-center-item"
                  data-type={item.type}
                  data-status={unread ? 'UNREAD' : 'READ'}
                  onClick={() => openItem(item)}
                >
                  <span className="notification-row-main">
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
                      <span className="notification-status-flag">
                        {unread ? notificationMessages.unread : notificationMessages.read}
                      </span>
                    </span>
                    <span className="notification-row-title">{item.title}</span>
                    <span className="notification-row-content">{item.content}</span>
                    {item.related_available === false ? (
                      <span className="notification-unavailable">
                        {notificationMessages.unavailable}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}