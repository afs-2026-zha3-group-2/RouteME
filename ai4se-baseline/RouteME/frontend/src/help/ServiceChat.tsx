import { useCallback, useRef } from 'react';
import { Button } from 'antd';
import { loadCurrentServiceSession } from '../api';
import { adminMessages } from '../i18n/adminMessages';
import type { DemoUser, ServiceSessionDetail } from '../types';
import { ServiceStatusBadge } from '../admin/adminBadges';
import { ServiceConversation } from '../admin/service/ServiceConversation';

type Props = {
  token: string;
  currentUser: DemoUser;
  session: ServiceSessionDetail;
  onSessionChange: (session: ServiceSessionDetail) => void;
  onRestart: () => void;
};

function statusHint(status: ServiceSessionDetail['status']): string {
  if (status === 'HANDLING') {
    return adminMessages.helpHandling;
  }
  if (status === 'CLOSED') {
    return adminMessages.helpClosed;
  }
  return adminMessages.helpWaiting;
}

/**
 * 用户侧客服会话：发起后等待接入，客服回复 3 秒内可见；
 * 会话被客服结束后本页立即显示「已结束」并可重新发起。
 */
export function ServiceChat({ token, currentUser, session, onSessionChange, onRestart }: Props) {
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const reloadSession = useCallback(async () => {
    const next = await loadCurrentServiceSession(token);
    if (next !== null) {
      return next;
    }
    // `current` 只返回未结束会话：原本有会话而这次为空，说明客服刚结束。
    return { ...sessionRef.current, status: 'CLOSED' as const };
  }, [token]);

  return (
    <div className="help-chat">
      <div className="help-chat-head">
        <ServiceStatusBadge status={session.status} />
        <span>{statusHint(session.status)}</span>
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