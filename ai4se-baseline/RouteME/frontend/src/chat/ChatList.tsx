import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import type { ChatPartner } from '../types';

type Props = {
  partners: ChatPartner[];
  activeTripId: number;
  activeOtherId: number;
};

/** 左栏会话列表：按最近消息倒序，无消息的排在末尾。 */
export function ChatList({ partners, activeTripId, activeOtherId }: Props) {
  return (
    <nav className="chat-list-pane" aria-label={tripMessages.chatListTitle}>
      {partners.map((partner) => {
        const active = partner.trip.id === activeTripId && partner.other.id === activeOtherId;
        return (
          <a
            key={`${partner.trip.id}-${partner.other.id}`}
            className={active ? 'chat-item on' : 'chat-item'}
            href={`#/chat/${partner.trip.id}/${partner.other.id}`}
            aria-current={active ? 'page' : undefined}
          >
            <Avatar user={partner.other} size="sm" />
            <span className="ci-body">
              <span className="ci-name">{partner.other.nickname}</span>
              <span className="ci-trip">{partner.trip.title}</span>
              <span className="ci-last">
                {partner.last_message?.content ?? tripMessages.chatNoMessages}
              </span>
            </span>
          </a>
        );
      })}
    </nav>
  );
}
