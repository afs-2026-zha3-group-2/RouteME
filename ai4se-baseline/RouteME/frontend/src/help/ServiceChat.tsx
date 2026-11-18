import { useCallback, useRef } from 'react';
import { Button, Popconfirm, message } from 'antd';
import { adminErrorText } from '../admin/adminFormat';
import { closeServiceSession, loadCurrentServiceSession } from '../api';
import { adminMessages } from '../i18n/adminMessages';
import type { DemoUser, ServiceSessionDetail } from '../types';
import { ServiceStatusBadge } from '../admin/adminBadges';
import { ServiceConversation } from '../admin/service/ServiceConversation';
import { serviceChatHint } from './helpStatus';

type Props = {
  token: string;
  currentUser: DemoUser;
  session: ServiceSessionDetail;
  onSessionChange: (session: ServiceSessionDetail) => void;
  onRestart: () => void;
};

/**
 * 用户侧客服会话：发起后等待接入，客服回复 3 秒内可见；
 * 未结束（WAITING / HANDLING / RESOLVED）时可主动结束，CLOSED 后可重新发起。
 */
export function ServiceChat({ token, currentUser, session, onSessionChange, onRestart }: Props) {
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const reloadSession = useCallback(async () => {
    const next = await loadCurrentServiceSession(token);
    if (next !== null) {
      return next;
    }
    // `current` 覆盖全部未结束状态：原本有会话而这次为空，说明会话已结束。
    return { ...sessionRef.current, status: 'CLOSED' as const };
  }, [token]);

  const close = async () => {
    try {
      onSessionChange(await closeServiceSession(token, session.id));
      message.success(adminMessages.serviceCloseToast);
    } catch (caught: unknown) {
      const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
      message.error(code === 'SESSION_CLOSED'
        ? adminMessages.serviceClosedMessage
        : adminErrorText(code));
    }
  };

  const waiting = session.status === 'WAITING';
  const canClose = session.status !== 'CLOSED';

  return (
    <div className="help-chat">
      <div className="help-chat-head">
        <ServiceStatusBadge status={session.status} />
        <span>{serviceChatHint(session.status)}</span>
        {canClose && (
          <Popconfirm
            title={waiting ? adminMessages.serviceCloseWaitTitle : adminMessages.serviceCloseTitle}
            description={waiting ? adminMessages.serviceCloseWaitBody : adminMessages.serviceCloseBody}
            okText={adminMessages.confirm}
            cancelText={adminMessages.cancel}
            onConfirm={close}
          >
            <Button size="small" danger>
              {adminMessages.serviceClose}
            </Button>
          </Popconfirm>
        )}
        {session.status === 'CLOSED' && (
          <Button size="small" onClick={onRestart}>
            {adminMessages.helpRestart}
          </Button>
        )}
      </div>

      <ServiceConversation
        token={token}
        currentUserId={currentUser.id}
        session={session}
        reloadSession={reloadSession}
        onSessionChange={onSessionChange}
        placeholder={adminMessages.helpInputPlaceholder}
        readOnlyText={adminMessages.serviceReadOnly}
        emptyText={adminMessages.helpChatEmpty}
        emptyHint={adminMessages.helpChatEmptyHint}
      />
    </div>
  );
}