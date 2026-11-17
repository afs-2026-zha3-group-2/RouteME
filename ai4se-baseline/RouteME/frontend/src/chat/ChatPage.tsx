import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Skeleton, Typography } from 'antd';
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
  tripId?: number;
  otherUserId?: number;
};

/**
 * 聊天页入口：短轮询 + 手动刷新，不做 WebSocket / 已读回执 / 推送 / 图片。
 * 不带参数时（`#/chat`）默认选中左栏第一个会话，与原型一致。
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

  const partner = useMemo(() => {
    if (partners === null) {
      return null;
    }
    if (tripId !== undefined && otherUserId !== undefined) {
      return (
        partners.find((item) => item.trip.id === tripId && item.other.id === otherUserId) ?? null
      );
    }
    return partners[0] ?? null;
  }, [partners, tripId, otherUserId]);

  const activeTripId = partner?.trip.id ?? tripId ?? 0;
  const activeOtherId = partner?.other.id ?? otherUserId ?? 0;

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
    loadMessages(currentUser.id, partner.trip.id, partner.other.id)
      .then((loaded) => {
        setMessages(loaded);
        setMessagesError(null);
      })
      .catch((caught: unknown) => {
        setMessages(null);
        setMessagesError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [partner, currentUser.id]);

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
    loadTrip(currentUser.id, partner.trip.id)
      .then((loaded) => setTrip(loaded))
      .catch(() => setTrip(null));
  }, [partner, currentUser.id, reloadMessages]);

  useEffect(() => {
    if (partner === null || trip === null || !shouldPoll(trip.status)) {
      return;
    }
    return startChatPolling(reloadMessages);
  }, [partner, trip, reloadMessages]);

  const send = async () => {
    if (!canSendMessage(content) || sending || partner === null) {
      return;
    }
    setSending(true);
    setMessagesError(null);
    try {
      const saved = await sendMessage(
        currentUser.id,
        partner.trip.id,
        partner.other.id,
        content.trim(),
      );
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
    if (partner === null || !window.confirm(tripMessages.leaveConfirm)) {
      return;
    }
    try {
      await leaveTrip(currentUser.id, partner.trip.id);
      setReloadToken((token) => token + 1);
      loadTrip(currentUser.id, partner.trip.id)
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
            <Button onClick={() => (window.location.hash = `#/trips/${activeTripId}`)}>
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
      <div className="page-head">
        <div>
          <Typography.Title level={2} className="page-title">
            {tripMessages.chatNav}
          </Typography.Title>
          <p className="page-sub">{tripMessages.chatPageSub}</p>
        </div>
        <Button
          size="small"
          type="text"
          onClick={() => {
            reloadPartners();
            reloadMessages();
          }}
        >
          {tripMessages.chatRefresh}
        </Button>
      </div>

      <div className="chat-layout">
        <ChatList partners={partners} activeTripId={activeTripId} activeOtherId={activeOtherId} />

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
            onProfile={() => openProfile(partner.other.id)}
            onReport={() => setReportOpen(true)}
            onLeave={leave}
          />
        )}
      </div>

      <ReportModal
        userId={currentUser.id}
        open={reportOpen}
        targetType="user"
        targetId={activeOtherId}
        targetLabel={partner.other.nickname}
        onClose={() => setReportOpen(false)}
      />
    </main>
  );
}
