import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { message } from 'antd';
import { loadNotifications, notificationStreamUrl, readNotification, readNotifications } from '../api';
import type { AppNotification, ChatMessage, GroupMessage, NotificationCounts, NotificationEvent } from '../types';
import {
  applyCounts,
  applyEvent,
  applySnapshot,
  emptyCounts,
  markAllLocal,
  markConversationLocal,
  markGroupConversationLocal,
  markOneLocal,
  shouldToast,
  unreadByConversation,
  type NotificationState,
} from './notificationModel';

type NotificationContextValue = {
  /** 当前登录用户 id；跳转「账号」类通知时需要拼个人主页地址。 */
  currentUserId: number;
  items: AppNotification[];
  counts: NotificationCounts;
  /** 每个会话的未读消息数，键为 `"${tripId}:${otherId}"` 或群键 `"${tripId}:group"`。 */
  unreadConversations: Map<string, number>;
  /** 当前打开的会话键；消息类提示与「不累计未读」都只看它。 */
  activeConversation: string | null;
  setActiveConversation: (key: string | null) => void;
  markOneRead: (id: number) => void;
  markAllRead: () => void;
  markConversationRead: (tripId: number, otherId: number) => void;
  /** 群会话标读：只清该行程的群消息通知。 */
  markGroupConversationRead: (tripId: number) => void;
  /** 首次 / 重连快照失败；只用于面板内的一行提示，不阻塞页面。 */
  loadFailed: boolean;
  reload: () => void;
  /** 最近一条消息类推送；聊天页据此在活动会话内即时追加，不必等轮询。 */
  lastMessageEvent: {
    tripId: number;
    otherId: number;
    message: ChatMessage;
  } | null;
  /** 最近一条群消息推送；群会话打开时即时追加。 */
  lastGroupMessageEvent: {
    tripId: number;
    message: GroupMessage;
  } | null;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (value === null) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return value;
}

function initialState(): NotificationState {
  return { items: [], counts: emptyCounts(), lastReadSeq: 0 };
}

type Props = {
  currentUser: { id: number };
  children: ReactNode;
};

/**
 * 全应用共用一份通知状态：快照对账 + SSE 推送 + 四处徽标 + 标读。
 *
 * <p>`seq` 每次发起快照递增；标读响应应用时也占用一个新序号并写入 `lastReadSeq`，
 * 因此更早发起的在途快照只合并条目、不会把刚标读掉的计数复活（design §6.1 / R-9）。</p>
 */
export function NotificationProvider({ currentUser, children }: Props) {
  const [state, setState] = useState<NotificationState>(initialState);
  const [activeConversation, setActiveConversationState] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [lastMessageEvent, setLastMessageEvent] = useState<NotificationContextValue['lastMessageEvent']>(null);
  const [lastGroupMessageEvent, setLastGroupMessageEvent] =
    useState<NotificationContextValue['lastGroupMessageEvent']>(null);

  const seqRef = useRef(0);
  const activeRef = useRef<string | null>(null);

  const setActiveConversation = useCallback((key: string | null) => {
    activeRef.current = key;
    setActiveConversationState(key);
  }, []);

  const reload = useCallback(() => {
    const seq = ++seqRef.current;
    loadNotifications(currentUser.id)
      .then((list) => {
        setState((previous) => applySnapshot(previous, list, seq));
        setLoadFailed(false);
      })
      .catch(() => {
        // 断网或后端不可用：保留当前计数，不清空、不弹阻塞对话框。
        setLoadFailed(true);
      });
  }, [currentUser.id]);

  useEffect(() => {
    seqRef.current = 0;
    activeRef.current = null;
    setActiveConversationState(null);
    setState(initialState());
    setLoadFailed(false);
    setLastMessageEvent(null);
    setLastGroupMessageEvent(null);
    reload();

    const source = new EventSource(notificationStreamUrl(currentUser.id));
    // 每次（重）连上都再对账一次，补齐断线期间漏掉的推送。
    source.onopen = () => reload();

    const onNotification = (raw: Event) => {
      const payload = raw as MessageEvent<string>;
      try {
        const event = JSON.parse(payload.data) as NotificationEvent;
        if (event?.notification === undefined) {
          return;
        }
        setState((previous) => applyEvent(previous, event, activeRef.current));
        if (
          event.message !== null
          && event.notification.type === 'CHAT'
          && event.notification.trip_id !== null
          && event.notification.actor !== null
        ) {
          setLastMessageEvent({
            tripId: event.notification.trip_id,
            otherId: event.notification.actor.id,
            message: event.message,
          });
        }
        if (
          event.group_message !== null
          && event.group_message !== undefined
          && event.notification.type === 'CHAT'
          && event.notification.trip_id !== null
        ) {
          setLastGroupMessageEvent({
            tripId: event.notification.trip_id,
            message: event.group_message,
          });
        }
        if (shouldToast(event.notification, activeRef.current)) {
          message.info({
            content: event.notification.content,
            key: `notification-${event.notification.id}`,
            duration: 4,
          });
        }
      } catch {
        // 载荷异常只丢弃这一条；连接继续接收下一条。
      }
    };
    source.addEventListener('notification', onNotification);

    return () => {
      source.removeEventListener('notification', onNotification);
      source.close();
    };
  }, [currentUser.id, reload]);

  const markOneRead = useCallback(
    (id: number) => {
      setState((previous) => markOneLocal(previous, id));
      readNotification(currentUser.id, id)
        .then((counts) => {
          const seq = ++seqRef.current;
          setState((previous) => applyCounts(previous, counts, seq));
        })
        .catch(() => {
          // 乐观归约保留；下一次快照对账会纠正。
        });
    },
    [currentUser.id],
  );

  const markAllRead = useCallback(() => {
    setState((previous) => markAllLocal(previous));
    readNotifications(currentUser.id, { scope: 'all' })
      .then((counts) => {
        const seq = ++seqRef.current;
        setState((previous) => applyCounts(previous, counts, seq));
      })
      .catch(() => {
        // 同上：保留乐观结果，等待对账。
      });
  }, [currentUser.id]);

  const markConversationRead = useCallback(
    (tripId: number, otherId: number) => {
      setState((previous) => markConversationLocal(previous, tripId, otherId));
      readNotifications(currentUser.id, {
        scope: 'conversation',
        trip_id: tripId,
        other_user_id: otherId,
      })
        .then((counts) => {
          const seq = ++seqRef.current;
          setState((previous) => applyCounts(previous, counts, seq));
        })
        .catch(() => {
          // 轮询与再次进入会话会重试，不需要用户操作。
        });
    },
    [currentUser.id],
  );

  const markGroupConversationRead = useCallback(
    (tripId: number) => {
      setState((previous) => markGroupConversationLocal(previous, tripId));
      readNotifications(currentUser.id, { scope: 'group_conversation', trip_id: tripId })
        .then((counts) => {
          const seq = ++seqRef.current;
          setState((previous) => applyCounts(previous, counts, seq));
        })
        .catch(() => {
          // 同单会话标读：保留乐观结果，等待对账。
        });
    },
    [currentUser.id],
  );

  const unreadConversations = useMemo(() => unreadByConversation(state.items), [state.items]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      currentUserId: currentUser.id,
      items: state.items,
      counts: state.counts,
      unreadConversations,
      activeConversation,
      setActiveConversation,
      markOneRead,
      markAllRead,
      markConversationRead,
      markGroupConversationRead,
      loadFailed,
      reload,
      lastMessageEvent,
      lastGroupMessageEvent,
    }),
    [
      currentUser.id,
      state.items,
      state.counts,
      unreadConversations,
      activeConversation,
      setActiveConversation,
      markOneRead,
      markAllRead,
      markConversationRead,
      markGroupConversationRead,
      loadFailed,
      reload,
      lastMessageEvent,
      lastGroupMessageEvent,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}