import { tripMessages } from '../i18n/tripMessages';
import { NotificationBadge } from '../notifications/NotificationBadge';
import { conversationKey } from '../notifications/notificationModel';
import { useNotifications } from '../notifications/NotificationContext';
import { Avatar } from '../shell/Avatar';
import type { ChatPartner } from '../types';
import { formatChatTime } from '../utils/chatTime';

type Props = {
  partners: ChatPartner[];
  activeTripId: number;
  activeOtherId: number;
};

/** 左栏会话列表：顶部固定会话头，下面是可滚动的会话行（按最近消息倒序）。 */
export function ChatList({ partners, activeTripId, activeOtherId }: Props) {
  const { unreadConversations } = useNotifications();

  return (
    <nav className="chat-list-pane" aria-label={tripMessages.chatListTitle}>
      <div className="chat-list-head">
        <span className="chat-list-title">{tripMessages.chatListTitle}</span>
        <span className="chat-list-count">{partners.length}</span>
      </div>
      <div className="chat-list-scroll">
        {partners.map((partner) => {
          const active = partner.trip.id === activeTripId && partner.other.id === activeOtherId;
          const unread =
            unreadConversations.get(conversationKey(partner.trip.id, partner.other.id)) ?? 0;
          return (
            <a
              key={`${partner.trip.id}-${partner.other.id}`}
              className={active ? 'chat-item on' : 'chat-item'}
              href={`#/chat/${partner.trip.id}/${partner.other.id}`}
              aria-current={active ? 'page' : undefined}
              aria-label={unread > 0 ? `${partner.other.nickname}，${unread} 条未读消息` : undefined}
            >
              <Avatar user={partner.other} />
              <span className="ci-body">
                <span className="ci-top">
                  <span className="ci-name">{partner.other.nickname}</span>
                  <NotificationBadge count={unread} testId="chat-unread-badge" />
                  {partner.last_message !== null && (
                    <span className="ci-time">
                      {formatChatTime(partner.last_message.sent_at)}
                    </span>
                  )}
                </span>
                <span className="ci-last">
                  {partner.last_message?.content ?? tripMessages.chatNoMessages}
                </span>
                <span className="ci-trip">{partner.trip.title}</span>
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}