import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { loadChatPartners, loadMessages, loadTrip, leaveTrip, sendMessage } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { useProfile } from '../profiles/ProfileContext';
import { ReportModal } from '../safety/ReportModal';
import type { ChatMessage, ChatPartner, DemoUser, TripDetail } from '../types';
import { ChatList } from './ChatList';
import { ChatMain } from './ChatMain';
import { canLeaveTrip } from './chatActions';
import { canSendMessage } from './chatComposer';
import { shouldPoll, startChatPolling } from './chatPolling';

type Props = {
  currentUser: DemoUser;
  tripId: number;
  otherUserId: number;
};

/**
 * 聊天页入口：短轮询 + 手动刷新，不做 WebSocket / 已读回执 / 推送 / 图片。
 * 左栏来自 `GET /api/me/chat-partners`（含已匹配但无消息的会话）。
 */
export function ChatPage({ currentUser, tripId, otherUserId }: Props) {
  const { openProfile } = useProfile();
  const [partners, setPartners] = useState<ChatPartner[] | null>(null);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const partner = useMemo(
    () => partners?.find((item) => item.trip.id === tripId && item.other.id === otherUserId) ?? null,
    [partners, tripId, otherUserId],
  );

  const reloadPartners = useCallback(() => {
    loadChatPartners(currentUser.id)
      .then((loaded) => {
        setPartners(loaded);
        setPartnersError(null);
      })
      .catch((caught: unknown) => {
        setPartners([]);
        setPartnersError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [currentUser.id]);

  useEffect(() => {
    reloadPartners();
  }, [reloadPartners, reloadToken]);

  const reloadMessages = useCallback(() => {
    if (partner === null) {
      return;
    }
    loadMessages(currentUser.id, tripId, otherUserId)
      .then((loaded) => {
        setMessages(loaded);
        setMessagesError(null);
      })
      .catch((caught: unknown) => {
        setMessages(null);
        setMessagesError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [partner, currentUser.id, tripId, otherUserId]);

  useEffect(() => {
    if (partner === null) {
      setTrip(null);
      setMessages(null);
      setMessagesError(null);
      return;
    }
    setMessages(null);
    setMessagesError(null);
    reloadMessages();
    loadTrip(currentUser.id, tripId)
      .then((loaded) => setTrip(loaded))
      .catch(() => setTrip(null));
  }, [partner, currentUser.id, tripId, reloadMessages]);

  useEffect(() => {
    if (partner === null || trip === null || !shouldPoll(trip.status)) {
      return;
    }
    return startChatPolling(reloadMessages);
  }, [partner, trip, reloadMessages]);

  const send = async () => {
    if (!canSendMessage(content) || sending) {
      return;
    }
    setSending(true);
    setMessagesError(null);
    try {
      const saved = await sendMessage(currentUser.id, tripId, otherUserId, content.trim());
      setMessages((previous) => [...(previous ?? []), saved]);
      setContent('');
      setReloadToken((token) => token + 1);
    } catch (caught: unknown) {
      setMessagesError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
    } finally {
      setSending(false);
    }
  };

  const leave = async () => {
    if (!window.confirm(tripMessages.leaveConfirm)) {
      return;
    }
    try {
      await leaveTrip(currentUser.id, tripId);
      setReloadToken((token) => token + 1);
      loadTrip(currentUser.id, tripId)
        .then((loaded) => setTrip(loaded))
        .catch(() => undefined);
    } catch (caught: unknown) {
      setMessagesError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
    }
  };

  if (partners === null && partnersError === null) {
    return (
      <main className="form-page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </main>
    );
  }

  if (partnersError !== null) {
    return (
      <main className="form-page">
        <Alert
          type="error"
          showIcon
          title={tripMessages.chatFailed}
          description={partnersError}
          action={<Button onClick={reloadPartners}>{tripMessages.retry}</Button>}
        />
      </main>
    );
  }

  if (partners !== null && partners.length === 0) {
    return (
      <main className="form-page">
        <Alert
          type="info"
          showIcon
          title={tripMessages.chatListEmpty}
          description={tripMessages.chatListEmptyHint}
          action={<Button onClick={() => (window.location.hash = '#/')}>{tripMessages.backHome}</Button>}
        />
      </main>
    );
  }

  if (partners !== null && partner === null) {
    return (
      <main className="form-page">
        <Alert
          type="warning"
          showIcon
          title={tripMessages.chatNotAllowed}
          description={tripMessages.chatNotAllowedHint}
          action={
            <Button onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
              {tripMessages.detailTitle}
            </Button>
          }
        />
      </main>
    );
  }

  if (partner === null || partners === null) {
    return (
      <main className="form-page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </main>
    );
  }

  const canLeave =
    trip !== null &&
    canLeaveTrip({
      currentUserId: currentUser.id,
      isPublisher: trip.publisher.id === currentUser.id,
      tripStatus: trip.status,
      participants: trip.participants,
    });

  return (
    <main className="chat-page">
      <ChatList partners={partners} activeTripId={tripId} activeOtherId={otherUserId} />

      {trip === null ? (
        <section className="chat-main">
          <Skeleton active paragraph={{ rows: 6 }} />
        </section>
      ) : (
        <ChatMain
          currentUser={currentUser}
          trip={trip}
          other={partner.other}
          messages={messages}
          error={messagesError}
          content={content}
          sending={sending}
          canLeave={canLeave}
          onContentChange={setContent}
          onSend={send}
          onReload={reloadMessages}
          onProfile={() => openProfile(partner.other.id)}
          onReport={() => setReportOpen(true)}
          onLeave={leave}
        />
      )}

      <ReportModal
        userId={currentUser.id}
        open={reportOpen}
        targetType="user"
        targetId={otherUserId}
        onClose={() => setReportOpen(false)}
      />
    </main>
  );
}
