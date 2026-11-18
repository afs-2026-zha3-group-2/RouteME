import { notificationMessages, creditRecordMessages } from '../i18n/notificationMessages';
import { useNotifications } from '../notifications/NotificationContext';
import { isUnread } from '../notifications/notificationModel';
import { formatChatTime } from '../utils/chatTime';

/**
 * 信用记录：由信用类通知派生，记录每次分数变动（变化量、原因、当前分数）与恢复说明。
 *
 * <p>记录只追加、不在信用状态变化时删除；通知失败也不会回滚信用业务。</p>
 */
export function CreditRecordsPage() {
  const { items, markOneRead } = useNotifications();
  const records = items.filter((item) => item.type === 'CREDIT');

  return (
    <main className="trip-page credit-records" data-testid="credit-records">
      <header className="notification-center-head">
        <div>
          <h1 className="page-title">{creditRecordMessages.title}</h1>
          <p className="notification-center-sub">{creditRecordMessages.subtitle}</p>
        </div>
        <a className="ghost-link" href="#/credit/learning">
          {creditRecordMessages.learn}
        </a>
      </header>

      {records.length === 0 ? (
        <p className="notification-center-empty" data-testid="credit-records-empty">
          {creditRecordMessages.empty}
        </p>
      ) : (
        <ul className="notification-center-list">
          {records.map((item) => {
            const unread = isUnread(item);
            return (
              <li key={item.id}>
                <div
                  className={unread ? 'notification-row is-unread' : 'notification-row'}
                  data-testid="credit-record-item"
                  data-status={unread ? 'UNREAD' : 'READ'}
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
                      {unread ? (
                        <button
                          type="button"
                          className="notification-mark-all"
                          onClick={() => markOneRead(item.id)}
                        >
                          {notificationMessages.unread}
                        </button>
                      ) : null}
                    </span>
                    <span className="notification-row-title">{item.title}</span>
                    <span className="notification-row-content">{item.content}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="notification-center-back">
        <a className="ghost-link" href="#/notifications">
          {creditRecordMessages.back}
        </a>
      </p>
    </main>
  );
}