import { useEffect, useRef } from 'react';
import { Button, Input, Skeleton } from 'antd';
import { CreditRestrictedNotice } from '../credit/CreditRestrictedNotice';
import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import type { ChatMessage, DemoUser, GroupMessage, TripDetail } from '../types';
import { canSendMessage, MAX_CHAT_LENGTH, shouldSendOnEnter } from './chatComposer';
import { chatSafetyText } from './chatMeeting';
import { buildGroupMembers } from './groupMembers';
import { formatChatTime } from '../utils/chatTime';

type Props = {
  currentUser: DemoUser;
  trip: TripDetail;
  other: DemoUser;
  messages: ChatMessage[] | null;
  error: string | null;
  content: string;
  sending: boolean;
  canLeave: boolean;
  restricted: boolean;
  /** 一对一场景：当前用户已退出该行程，消息只读。 */
  leftTrip?: boolean;
  onContentChange: (value: string) => void;
  onSend: () => void;
  onProfile: () => void;
  onReport: () => void;
  onLeave: () => void;
  /** 群成员条点击成员：打开其资料弹窗。 */
  onMemberProfile?: (userId: number) => void;
  /** 群变体：传入时头部为行程标题 + 成员数，常显成员条，气泡带发送者，隐藏资料 / 举报 / 退出。 */
  group?: {
    memberCount: number;
    messages: GroupMessage[] | null;
    /** 已退出该行程：只读回看，不再渲染输入框。 */
    left?: boolean;
  };
};

function formatRange(start: string, end: string): string {
  return start === end ? start : `${start} → ${end}`;
}

/** 右栏：会话头部动作、集合安全条、消息区与输入区（对齐原型 `UI.chat()`）。 */
export function ChatMain({
  currentUser,
  trip,
  other,
  messages,
  error,
  content,
  sending,
  canLeave,
  restricted,
  leftTrip = false,
  onContentChange,
  onSend,
  onProfile,
  onReport,
  onLeave,
  onMemberProfile,
  group,
}: Props) {
  const completed = trip.status === 'completed';
  const cancelled = trip.status === 'cancelled';
  const closed = completed || cancelled;
  const leftGroup = group?.left === true;
  const activeMessages = group !== undefined ? group.messages : messages;
  const loading = activeMessages === null && error === null;

  const bodyRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const groupMembers =
    group !== undefined ? buildGroupMembers(trip.publisher, trip.participants) : [];

  // 有新消息时贴在底部；轮询但没有新消息时不打断向上翻阅。
  useEffect(() => {
    const node = bodyRef.current;
    const count = activeMessages?.length ?? 0;
    if (node !== null && count > lastCountRef.current) {
      node.scrollTop = node.scrollHeight;
    }
    lastCountRef.current = count;
  }, [activeMessages]);

  return (
    <section className="chat-main">
      <div className="chat-head">
        {group !== undefined ? (
          <span className="avatar chat-group-avatar" aria-hidden="true">
            群
          </span>
        ) : (
          <Avatar user={other} />
        )}
        <span className="chat-head-info">
          <span className="chat-head-name">
            {group !== undefined ? trip.title : other.nickname}
          </span>
          <span className="chat-head-trip">
            {group !== undefined
              ? `${tripMessages.chatGroupMembers(group.memberCount)} · ${formatRange(trip.start_date, trip.end_date)}`
              : `${trip.title} · ${formatRange(trip.start_date, trip.end_date)}`}
          </span>
        </span>
        <span className="chat-head-actions">
          {group === undefined && (
            <Button size="small" type="text" onClick={onProfile}>
              {tripMessages.chatProfile}
            </Button>
          )}
          <a className="chat-link" href={`#/trips/${trip.id}`}>
            {tripMessages.chatTrip}
          </a>
          {group === undefined && (
            <Button size="small" type="text" danger onClick={onReport}>
              {tripMessages.reportEntryUser}
            </Button>
          )}
          {group === undefined && canLeave && (
            <Button size="small" type="text" danger onClick={onLeave}>
              {tripMessages.leaveTrip}
            </Button>
          )}
        </span>
      </div>

      {group !== undefined && (
        <div className="chat-group-members" data-testid="chat-group-members">
          <span className="chat-group-members-title">
            {tripMessages.chatGroupMembersTitle} · {tripMessages.chatGroupMembers(groupMembers.length)}
          </span>
          <ul className="chat-group-members-list">
            {groupMembers.map((member) => (
              <li key={member.user.id}>
                <button
                  type="button"
                  className="chat-group-member"
                  data-testid="chat-group-member"
                  aria-label={`查看 ${member.user.nickname} 的资料`}
                  onClick={() => onMemberProfile?.(member.user.id)}
                >
                  <Avatar user={member.user} size="sm" />
                  <span className="chat-group-member-name">{member.user.nickname}</span>
                  {member.role === 'publisher' && (
                    <span className="chat-group-badge">{tripMessages.chatGroupOwnerBadge}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="chat-safety">
        <span>{chatSafetyText(trip.meeting_areas, trip.meeting_time)}</span>
      </div>

      <div className="chat-body" ref={bodyRef} aria-live="polite">
        {loading && <Skeleton active paragraph={{ rows: 4 }} />}

        {error !== null && (
          <p className="chat-error" role="alert">
            {error === 'CHAT_LEFT' || error === 'CHAT_GROUP_LEFT'
              ? group !== undefined
                ? tripMessages.chatGroupLeftNotice
                : tripMessages.chatLeftNotice
              : `${tripMessages.chatSendFailed}：${error}`}
          </p>
        )}

        {activeMessages !== null && activeMessages.length === 0 && (
          <div className="chat-empty">
            <p className="empty-title">
              {group !== undefined ? tripMessages.chatGroupEmpty : tripMessages.chatEmpty}
            </p>
            <p className="empty-text">
              {group !== undefined ? tripMessages.chatGroupEmptyHint : tripMessages.chatEmptyHint}
            </p>
          </div>
        )}

        {group !== undefined &&
          group.messages !== null &&
          group.messages.map((message) => {
            const mine = message.sender.id === currentUser.id;
            return (
              <div key={message.id} className={mine ? 'msg me' : 'msg'}>
                {!mine && <Avatar user={message.sender} size="sm" />}
                <span className="msg-col">
                  {!mine && <span className="msg-sender">{message.sender.nickname}</span>}
                  <span className="bubble">{message.content}</span>
                  <span className="msg-time">{formatChatTime(message.sent_at)}</span>
                </span>
              </div>
            );
          })}

        {group === undefined &&
          messages !== null &&
          messages.map((message) => {
            const mine = message.sender_id === currentUser.id;
            return (
              <div key={message.id} className={mine ? 'msg me' : 'msg'}>
                {!mine && <Avatar user={other} size="sm" />}
                <span className="msg-col">
                  <span className="bubble">{message.content}</span>
                  <span className="msg-time">{formatChatTime(message.sent_at)}</span>
                </span>
              </div>
            );
          })}
      </div>

      {closed ? (
        <div className="composer-closed">
          {cancelled ? tripMessages.chatReadOnlyCancelled : tripMessages.chatReadOnly}
        </div>
      ) : leftGroup ? (
        <div className="composer-closed">{tripMessages.chatGroupLeftNotice}</div>
      ) : leftTrip ? (
        <div className="composer-closed">{tripMessages.chatLeftNotice}</div>
      ) : restricted ? (
        <div className="composer-closed">
          <CreditRestrictedNotice />
        </div>
      ) : (
        <div className="composer">
          <Input.TextArea
            className="composer-input"
            value={content}
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={MAX_CHAT_LENGTH}
            placeholder={
              group !== undefined
                ? tripMessages.chatGroupInputPlaceholder
                : tripMessages.chatInputPlaceholder
            }
            onChange={(event) => onContentChange(event.target.value)}
            onKeyDown={(event) => {
              const composing = (event.nativeEvent as KeyboardEvent).isComposing === true;
              if (
                shouldSendOnEnter({
                  key: event.key,
                  shiftKey: event.shiftKey,
                  isComposing: composing,
                })
              ) {
                event.preventDefault();
                if (canSendMessage(content) && !sending) {
                  onSend();
                }
              }
            }}
          />
          <Button
            type="primary"
            loading={sending}
            disabled={!canSendMessage(content)}
            onClick={onSend}
          >
            {tripMessages.chatSend}
          </Button>
        </div>
      )}
    </section>
  );
}