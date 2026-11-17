import { useEffect, useRef, useState } from 'react';
import { Button, Input } from 'antd';
import { adminErrorText } from '../adminFormat';
import { sendServiceMessage } from '../../api';
import { canSendMessage, MAX_CHAT_LENGTH, shouldSendOnEnter } from '../../chat/chatComposer';
import { startChatPolling } from '../../chat/chatPolling';
import { formatChatTime } from '../../chat/chatTime';
import { adminMessages } from '../../i18n/adminMessages';
import type { ServiceSessionDetail } from '../../types';

type Props = {
  token: string;
  currentUserId: number;
  session: ServiceSessionDetail;
  reloadSession: () => Promise<ServiceSessionDetail | null>;
  onSessionChange: (session: ServiceSessionDetail) => void;
  placeholder: string;
  readOnlyText: string;
  emptyText: string;
  emptyHint: string;
};

/**
 * 客服消息区（用户端与后台共用）：按发送时间升序展示，3 秒短轮询同步，
 * `CLOSED` 后停止轮询并把输入框换成只读提示。
 */
export function ServiceConversation({
  token,
  currentUserId,
  session,
  reloadSession,
  onSessionChange,
  placeholder,
  readOnlyText,
  emptyText,
  emptyHint,
}: Props) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef(reloadSession);
  const changeRef = useRef(onSessionChange);
  reloadRef.current = reloadSession;
  changeRef.current = onSessionChange;

  const closed = session.status === 'CLOSED';

  useEffect(() => {
    if (closed) {
      return;
    }
    const stop = startChatPolling(() => {
      if (document.hidden) {
        return;
      }
      void reloadRef
        .current()
        .then((next) => {
          if (next !== null) {
            changeRef.current(next);
          }
        })
        .catch(() => {
          // 轮询失败不打断当前会话，下一 tick 继续重试。
        });
    });
    return stop;
  }, [closed]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [session.messages.length]);

  const reload = async () => {
    const next = await reloadRef.current();
    if (next !== null) {
      changeRef.current(next);
    }
  };

  const send = async () => {
    if (!canSendMessage(draft) || sending) {
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await sendServiceMessage(token, session.id, draft.trim());
      setDraft('');
      await reload();
    } catch (caught: unknown) {
      const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
      setSendError(adminErrorText(code));
      if (code === 'SESSION_CLOSED') {
        await reload().catch(() => undefined);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="service-chat">
      <div className="chat-body service-chat-body">
        {session.messages.length === 0 && (
          <div className="chat-empty">
            <p className="empty-title">{emptyText}</p>
            <p className="empty-text">{emptyHint}</p>
          </div>
        )}

        {session.messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          const senderLabel =
            message.sender_type === 'ADMIN'
              ? adminMessages.serviceSenderAdmin
              : adminMessages.serviceSenderUser;
          return (
            <div key={message.id} className={mine ? 'msg me' : 'msg'}>
              <span className="msg-col">
                <span className="service-msg-author">
                  {senderLabel} · {message.sender_nickname}
                </span>
                <span className="bubble">{message.content}</span>
                <span className="msg-time">{formatChatTime(message.created_at)}</span>
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendError !== null && (
        <p className="chat-error" role="alert">
          {sendError}
        </p>
      )}

      {closed ? (
        <div className="composer-closed">{readOnlyText}</div>
      ) : (
        <div className="composer">
          <Input.TextArea
            className="composer-input"
            value={draft}
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={MAX_CHAT_LENGTH}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
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
                if (canSendMessage(draft) && !sending) {
                  void send();
                }
              }
            }}
          />
          <Button
            type="primary"
            loading={sending}
            disabled={!canSendMessage(draft)}
            onClick={() => void send()}
          >
            {adminMessages.serviceSend}
          </Button>
        </div>
      )}
    </div>
  );
}