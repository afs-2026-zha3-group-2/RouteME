import { tripMessages } from '../i18n/tripMessages';
import { NotificationBadge } from '../notifications/NotificationBadge';
import { useNotifications } from '../notifications/NotificationContext';
import { Avatar } from '../shell/Avatar';
import type { ChatPartner, GroupChatSummary } from '../types';
import { formatChatTime } from '../utils/chatTime';
import { mergeConversations } from './chatConversations';

type Props = {
  partners: ChatPartner[];
  groups: GroupChatSummary[];
  /** 当前打开的会话键；一对一是 `"${tripId}:${otherId}"`，群是 `"${tripId}:group"`。 */
  activeKey: string | null;
};

/** 左栏会话列表：一对一与群按最近消息倒序混排，顶部固定会话头。 */
export function ChatList({ partners, groups, activeKey }: Props) {
  const { unreadConversations } = useNotifications();
  const rows = mergeConversations(partners, groups);

  return (
    <nav className="chat-list-pane" aria-label={tripMessages.chatListTitle}>
      <div className="chat-list-head">
        <span className="chat-list-title">{tripMessages.chatListTitle}</span>
        <span className="chat-list-count">{rows.length}</span>
      </div>
      <div className="chat-list-scroll">
        {rows.map((row) => {
          const active = row.key === activeKey;
          const unread = unreadConversations.get(row.key) ?? 0;
          if (row.kind === 'group') {
            const summary = row.group;
            const last = summary.last_message;
            return (
              <a
                key={row.key}
                className={active ? 'chat-item on' : 'chat-item'}
                href={`#/chat/${row.tripId}/group`}
                aria-current={active ? 'page' : undefined}
                aria-label={
                  unread > 0
                    ? `${summary.trip.title} 群聊，${unread} 条未读消息`
                    : undefined
                }
              >
                <span className="avatar chat-group-avatar" aria-hidden="true">
                  群
                </span>
                <span className="ci-body">
                  <span className="ci-top">
                    <span className="ci-name">{summary.trip.title}</span>
                    <span className="chat-group-badge">{tripMessages.chatGroupBadge}</span>
                    {summary.left === true && (
                      <span className="chat-group-left-badge">
                        {tripMessages.chatGroupLeftBadge}
                      </span>
                    )}
                    <NotificationBadge count={unread} testId="chat-unread-badge" />
                    {last !== null && (
                      <span className="ci-time">{formatChatTime(last.sent_at)}</span>
                    )}
                  </span>
                  <span className="ci-last">
                    {last !== null
                      ? `${last.sender.nickname}：${last.content}`
                      : tripMessages.chatNoMessages}
                  </span>
                  <span className="ci-trip">
                    {tripMessages.chatGroupMembers(summary.member_count)}
                  </span>
                </span>
              </a>
            );
          }
          const partner = row.partner;
          return (
            <a
              key={row.key}
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