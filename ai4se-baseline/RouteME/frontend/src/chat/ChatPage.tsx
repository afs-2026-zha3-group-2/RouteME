import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Skeleton, Typography } from 'antd';
import {
  loadChatPartners,
  loadGroupMessages,
  loadMessages,
  loadMyGroups,
  loadTrip,
  sendGroupMessage,
  sendMessage,
} from '../api';
import { useMyCredit } from '../credit/CreditContext';
import { useStudentGate } from '../identity/StudentVerificationGate';
import { tripMessages } from '../i18n/tripMessages';
import { conversationKey, groupConversationKey } from '../notifications/notificationModel';
import { useNotifications } from '../notifications/NotificationContext';
import { useProfile } from '../profiles/ProfileContext';
import { ReportModal } from '../safety/ReportModal';
import { TripLeaveModal } from '../trips/TripLeaveModal';
import type { ChatMessage, ChatPartner, DemoUser, GroupChatSummary, GroupMessage, TripDetail } from '../types';
import { ChatList } from './ChatList';
import { ChatMain } from './ChatMain';
import { canLeaveTrip } from './chatActions';
import { canSendMessage } from './chatComposer';
import { mergeConversations } from './chatConversations';
import { shouldPoll, startChatPolling } from './chatPolling';

type Props = {
  currentUser: DemoUser;
  tripId?: number;
  otherUserId?: number;
  /** `#/chat/{tripId}/group`：打开该行程的群聊。 */
  group?: boolean;
};

/**
 * 聊天页入口：短轮询 + 手动刷新，不做 WebSocket / 已读回执 / 图片。
 * 一对一与群会话混排在左栏；不带参数时（`#/chat`）默认选中第一个会话。
 */
export function ChatPage({ currentUser, tripId, otherUserId, group }: Props) {
  const { openProfile } = useProfile();
  const {
    unreadConversations,
    setActiveConversation,
    markConversationRead,
    markGroupConversationRead,
    lastMessageEvent,
    lastGroupMessageEvent,
  } = useNotifications();
  const { restricted, refresh: refreshCredit } = useMyCredit();
  const [partners, setPartners] = useState<ChatPartner[] | null>(null);
  const [groups, setGroups] = useState<GroupChatSummary[] | null>(null);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[] | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const studentGate = useStudentGate(currentUser);

  // 路由定位优先；都没有时选混排后的第一个会话。
  const selected = useMemo(() => {
    if (partners === null || groups === null) {
      return null;
    }
    const rows = mergeConversations(partners, groups);
    if (group === true && tripId !== undefined) {
      return rows.find((row) => row.kind === 'group' && row.tripId === tripId) ?? null;
    }
    if (group !== true && tripId !== undefined && otherUserId !== undefined) {
      return (
        rows.find(
          (row) => row.kind === 'direct' && row.tripId === tripId && row.otherId === otherUserId,
        ) ?? null
      );
    }
    return rows[0] ?? null;
  }, [partners, groups, group, tripId, otherUserId]);

  const partner = selected?.kind === 'direct' ? selected.partner : null;
  const groupSummary = selected?.kind === 'group' ? selected.group : null;
  const activeTripId = selected?.tripId ?? tripId ?? 0;
  const activeOtherId = partner?.other.id ?? otherUserId ?? 0;
  const activeKey = selected?.key ?? null;

  // 轮询保底标读：读消息时若本地该会话仍有未读，再清一次，覆盖推送漏掉的路径。
  const unreadRef = useRef(unreadConversations);
  useEffect(() => {
    unreadRef.current = unreadConversations;
  }, [unreadConversations]);

  const reloadConversations = useCallback(() => {
    Promise.all([loadChatPartners(currentUser.id), loadMyGroups(currentUser.id)])
      .then(([loadedPartners, loadedGroups]) => {
        setPartners(loadedPartners);
        setGroups(loadedGroups);
        setPartnersError(null);
      })
      .catch((caught: unknown) => {
        setPartners([]);
        setGroups([]);
        setPartnersError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [currentUser.id]);

  useEffect(() => {
    reloadConversations();
  }, [reloadConversations, reloadToken]);

  const reloadMessages = useCallback(() => {
    if (partner === null) {
      return;
    }
    loadMessages(currentUser.id, partner.trip.id, partner.other.id)
      .then((loaded) => {
        setMessages(loaded);
        setMessagesError(null);
        const key = conversationKey(partner.trip.id, partner.other.id);
        if ((unreadRef.current.get(key) ?? 0) > 0) {
          markConversationRead(partner.trip.id, partner.other.id);
        }
      })
      .catch((caught: unknown) => {
        setMessages(null);
        setMessagesError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [partner, currentUser.id, markConversationRead]);

  const reloadGroupMessages = useCallback(() => {
    if (groupSummary === null) {
      return;
    }
    loadGroupMessages(currentUser.id, groupSummary.trip.id)
      .then((loaded) => {
        setGroupMessages(loaded);
        setMessagesError(null);
        const key = groupConversationKey(groupSummary.trip.id);
        if ((unreadRef.current.get(key) ?? 0) > 0) {
          markGroupConversationRead(groupSummary.trip.id);
        }
      })
      .catch((caught: unknown) => {
        setGroupMessages(null);
        setMessagesError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [groupSummary, currentUser.id, markGroupConversationRead]);

  useEffect(() => {
    setMessages(null);
    setGroupMessages(null);
    setMessagesError(null);
    if (partner !== null) {
      reloadMessages();
    } else if (groupSummary !== null) {
      reloadGroupMessages();
    } else {
      setTrip(null);
      return;
    }
    loadTrip(currentUser.id, activeTripId)
      .then((loaded) => setTrip(loaded))
      .catch(() => setTrip(null));
  }, [partner, groupSummary, activeTripId, currentUser.id, reloadMessages, reloadGroupMessages]);

  useEffect(() => {
    if (trip === null || !shouldPoll(trip.status)) {
      return;
    }
    if (partner !== null) {
      return startChatPolling(reloadMessages);
    }
    if (groupSummary !== null) {
      return startChatPolling(reloadGroupMessages);
    }
    return undefined;
  }, [partner, groupSummary, trip, reloadMessages, reloadGroupMessages]);

  // 打开会话：登记为活动会话并标读；离开时清空，让后续消息重新进入未读提示。
  useEffect(() => {
    if (selected === null) {
      return;
    }
    setActiveConversation(selected.key);
    if (selected.kind === 'direct') {
      markConversationRead(selected.tripId, selected.otherId);
    } else {
      markGroupConversationRead(selected.tripId);
    }
    return () => setActiveConversation(null);
  }, [selected, setActiveConversation, markConversationRead, markGroupConversationRead]);

  // 活动会话的推送直接追加到消息列表，不提示、不累计未读（D14 / S23-24）。
  useEffect(() => {
    if (lastMessageEvent === null || partner === null) {
      return;
    }
    if (
      lastMessageEvent.tripId !== partner.trip.id
      || lastMessageEvent.otherId !== partner.other.id
    ) {
      return;
    }
    setMessages((previous) => {
      const current = previous ?? [];
      if (current.some((message) => message.id === lastMessageEvent.message.id)) {
        return current;
      }
      return [...current, lastMessageEvent.message];
    });
    markConversationRead(partner.trip.id, partner.other.id);
  }, [lastMessageEvent, partner, markConversationRead]);

  // 群会话同理：活动群的推送即时追加并标读。
  useEffect(() => {
    if (lastGroupMessageEvent === null || groupSummary === null) {
      return;
    }
    if (lastGroupMessageEvent.tripId !== groupSummary.trip.id) {
      return;
    }
    setGroupMessages((previous) => {
      const current = previous ?? [];
      if (current.some((message) => message.id === lastGroupMessageEvent.message.id)) {
        return current;
      }
      return [...current, lastGroupMessageEvent.message];
    });
    markGroupConversationRead(groupSummary.trip.id);
  }, [lastGroupMessageEvent, groupSummary, markGroupConversationRead]);

  const send = async () => {
    if (!canSendMessage(content) || sending || selected === null) {
      return;
    }
    if (!studentGate.allowed) {
      studentGate.requireVerified(() => undefined);
      return;
    }
    setSending(true);
    setMessagesError(null);
    try {
      if (selected.kind === 'group') {
        const saved = await sendGroupMessage(currentUser.id, selected.tripId, content.trim());
        setGroupMessages((previous) => [...(previous ?? []), saved]);
      } else {
        const saved = await sendMessage(
          currentUser.id,
          selected.tripId,
          selected.otherId,
          content.trim(),
        );
        setMessages((previous) => [...(previous ?? []), saved]);
      }
      setContent('');
      setReloadToken((token) => token + 1);
    } catch (caught: unknown) {
      setMessagesError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      // 已退出行程：刷新会话与行程，把输入区切成只读提示（历史仍可回看）。
      if (caught instanceof Error && (caught.message === 'CHAT_LEFT' || caught.message === 'CHAT_GROUP_LEFT')) {
        setReloadToken((token) => token + 1);
        loadTrip(currentUser.id, activeTripId)
          .then((loaded) => setTrip(loaded))
          .catch(() => undefined);
      }
    } finally {
      setSending(false);
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
          action={<Button onClick={reloadConversations}>{tripMessages.retry}</Button>}
        />
      </main>
    );
  }

  if (partners !== null && partners.length === 0 && (groups?.length ?? 0) === 0) {
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

  if (selected === null) {
    const groupRequested = group === true;
    return (
      <main className="form-page">
        <Alert
          type="warning"
          showIcon
          title={groupRequested ? tripMessages.chatGroupUnavailable : tripMessages.chatNotAllowed}
          description={
            groupRequested ? tripMessages.chatGroupUnavailableHint : tripMessages.chatNotAllowedHint
          }
          action={
            <Button
              onClick={() =>
                (window.location.hash = tripId !== undefined ? `#/trips/${tripId}` : '#/chat')
              }
            >
              {tripId !== undefined ? tripMessages.detailTitle : tripMessages.chatListTitle}
            </Button>
          }
        />
      </main>
    );
  }

  const canLeave =
    partner !== null &&
    trip !== null &&
    canLeaveTrip({
      currentUserId: currentUser.id,
      isPublisher: trip.publisher.id === currentUser.id,
      tripStatus: trip.status,
      participants: trip.participants,
    });

  // 已退出行程的同行者：既不是发布者也不在当前参与者列表里，但仍保留历史会话。
  const leftTrip =
    trip !== null &&
    trip.publisher.id !== currentUser.id &&
    !trip.participants.some((member) => member.id === currentUser.id);

  return (
    <main className="chat-page">
      {studentGate.prompt}
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
            reloadConversations();
            reloadMessages();
            reloadGroupMessages();
          }}
        >
          {tripMessages.chatRefresh}
        </Button>
      </div>

      <div className="chat-layout">
        <ChatList partners={partners ?? []} groups={groups ?? []} activeKey={activeKey} />

        {trip === null ? (
          <section className="chat-main">
            <Skeleton active paragraph={{ rows: 6 }} />
          </section>
        ) : (
          <ChatMain
            currentUser={currentUser}
            trip={trip}
            other={partner?.other ?? currentUser}
            messages={messages}
            error={messagesError}
            content={content}
            sending={sending}
            canLeave={canLeave}
            restricted={restricted}
            leftTrip={leftTrip}
            onContentChange={setContent}
            onSend={send}
            onProfile={() => partner !== null && openProfile(partner.other.id)}
            onMemberProfile={(userId) => openProfile(userId)}
            onReport={() => setReportOpen(true)}
            onLeave={() => setLeaveOpen(true)}
            group={
              groupSummary !== null
                ? {
                    memberCount: groupSummary.member_count,
                    messages: groupMessages,
                    left: groupSummary.left === true,
                  }
                : undefined
            }
          />
        )}
      </div>

      {partner !== null && (
        <TripLeaveModal
          open={leaveOpen}
          userId={currentUser.id}
          tripId={partner.trip.id}
          title={partner.trip.title}
          onClose={() => setLeaveOpen(false)}
          onLeft={() => {
            setLeaveOpen(false);
            refreshCredit();
            setReloadToken((token) => token + 1);
            loadTrip(currentUser.id, partner.trip.id)
              .then((loaded) => setTrip(loaded))
              .catch(() => undefined);
          }}
        />
      )}

      {partner !== null && (
        <ReportModal
          userId={currentUser.id}
          open={reportOpen}
          targetType="user"
          targetId={activeOtherId}
          targetLabel={partner.other.nickname}
          tripId={activeTripId}
          onClose={() => setReportOpen(false)}
        />
      )}
    </main>
  );
}