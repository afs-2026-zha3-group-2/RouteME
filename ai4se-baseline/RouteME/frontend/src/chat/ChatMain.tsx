import { Button, Input, Skeleton } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import type { ChatMessage, DemoUser, TripDetail } from '../types';
import { canSendMessage, MAX_CHAT_LENGTH, shouldSendOnEnter } from './chatComposer';
import { chatSafetyText } from './chatMeeting';
import { formatChatTime } from './chatTime';

type Props = {
  currentUser: DemoUser;
  trip: TripDetail;
  other: DemoUser;
  messages: ChatMessage[] | null;
  error: string | null;
  content: string;
  sending: boolean;
  canLeave: boolean;
  onContentChange: (value: string) => void;
  onSend: () => void;
  onReload: () => void;
  onProfile: () => void;
  onReport: () => void;
  onLeave: () => void;
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
  onContentChange,
  onSend,
  onReload,
  onProfile,
  onReport,
  onLeave,
}: Props) {
  const completed = trip.status === 'completed';
  const loading = messages === null && error === null;

  return (
    <section className="chat-main">
      <div className="chat-head">
        <Avatar user={other} size="lg" />
        <span className="chat-head-info">
          <span className="chat-head-name">{other.nickname}</span>
          <span className="chat-head-trip">
            {trip.title} · {formatRange(trip.start_date, trip.end_date)}
          </span>
        </span>
        <span className="chat-head-actions">
          <Button size="small" type="text" onClick={onProfile}>
            {tripMessages.chatProfile}
          </Button>
          <a className="chat-link" href={`#/trips/${trip.id}`}>
            {tripMessages.chatTrip}
          </a>
          <Button size="small" type="text" danger onClick={onReport}>
            {tripMessages.reportEntry}
          </Button>
          {canLeave && (
            <Button size="small" type="text" danger onClick={onLeave}>
              {tripMessages.leaveTrip}
            </Button>
          )}
        </span>
      </div>

      <div className="chat-safety">
        <span>{chatSafetyText(trip.meeting_area, trip.meeting_time)}</span>
      </div>

      <div className="chat-tools">
        <Button size="small" type="text" onClick={onReload}>
          {tripMessages.chatRefresh}
        </Button>
      </div>

      <div className="chat-body">
        {loading && <Skeleton active paragraph={{ rows: 4 }} />}

        {error !== null && (
          <p className="chat-error" role="alert">
            {tripMessages.chatSendFailed}：{error}
          </p>
        )}

        {messages !== null && messages.length === 0 && (
          <div className="chat-empty">
            <p className="empty-title">{tripMessages.chatEmpty}</p>
            <p className="empty-text">{tripMessages.chatEmptyHint}</p>
          </div>
        )}

        {messages !== null &&
          messages.map((message) => {
            const mine = message.sender_id === currentUser.id;
            return (
              <div key={message.id} className={mine ? 'msg me' : 'msg'}>
                <Avatar user={mine ? currentUser : other} size="sm" />
                <span className="msg-col">
                  <span className="bubble">{message.content}</span>
                  <span className="msg-time">{formatChatTime(message.sent_at)}</span>
                </span>
              </div>
            );
          })}
      </div>

      {completed ? (
        <div className="composer-closed">{tripMessages.chatReadOnly}</div>
      ) : (
        <div className="composer">
          <Input.TextArea
            className="composer-input"
            value={content}
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={MAX_CHAT_LENGTH}
            placeholder={tripMessages.chatInputPlaceholder}
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
