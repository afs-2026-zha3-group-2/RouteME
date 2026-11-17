import type {
  AppNotification,
  NotificationCounts,
  NotificationEvent,
  NotificationList,
} from '../types';

/** 列表展示上限，与后端 `maxItems=50` 一致。 */
export const MAX_NOTIFICATION_ITEMS = 50;

/** 四处徽标共用的一份状态；`lastReadSeq` 是「在途快照」护栏（design §6.1 / R-9）。 */
export type NotificationState = {
  items: AppNotification[];
  counts: NotificationCounts;
  lastReadSeq: number;
};

const APPLICATION_TYPES = new Set<string>([
  'application_received',
  'application_accepted',
  'application_rejected',
]);

/** 空计数；每次新建对象，避免调用方共享可变状态。 */
export function emptyCounts(): NotificationCounts {
  return { total: 0, application: 0, message: 0 };
}

/** 会话键 `"${tripId}:${otherId}"`；徽标、提示与标读共用同一口径。 */
export function conversationKey(tripId: number, otherId: number): string {
  return `${tripId}:${otherId}`;
}

/** 按 `created_at DESC, id DESC` 排序并截断，顺序与后端列表一致。 */
function normalize(items: AppNotification[]): AppNotification[] {
  return [...items]
    .sort((left, right) => {
      if (left.created_at !== right.created_at) {
        return left.created_at < right.created_at ? 1 : -1;
      }
      return right.id - left.id;
    })
    .slice(0, MAX_NOTIFICATION_ITEMS);
}

function unbump(counts: NotificationCounts, item: AppNotification): NotificationCounts {
  return {
    total: Math.max(0, counts.total - 1),
    application: Math.max(0, counts.application - (APPLICATION_TYPES.has(item.type) ? 1 : 0)),
    message: Math.max(0, counts.message - (item.type === 'message' ? 1 : 0)),
  };
}

/**
 * 合并 REST 快照与本地推送：按 id 去重、`read` 单调、保留最新 50 条。
 *
 * <p>计数逐项取较大值；若本次快照在最近一次标读之后才发起（`seq < lastReadSeq`），
 * 只合并条目、不采用计数，避免在途快照把刚标读掉的计数复活。</p>
 */
export function applySnapshot(
  state: NotificationState,
  list: NotificationList,
  seq: number,
): NotificationState {
  const byId = new Map<number, AppNotification>();
  state.items.forEach((item) => byId.set(item.id, item));
  list.items.forEach((item) => {
    const local = byId.get(item.id);
    byId.set(item.id, local === undefined ? item : { ...item, read: local.read || item.read });
  });
  const counts =
    state.lastReadSeq > seq
      ? state.counts
      : {
          total: Math.max(state.counts.total, list.counts.total),
          application: Math.max(state.counts.application, list.counts.application),
          message: Math.max(state.counts.message, list.counts.message),
        };
  return { items: normalize([...byId.values()]), counts, lastReadSeq: state.lastReadSeq };
}

/** 用服务端标读响应覆盖计数，并记录该响应相对快照的发起序号。 */
export function applyCounts(
  state: NotificationState,
  counts: NotificationCounts,
  seq: number,
): NotificationState {
  return { ...state, counts, lastReadSeq: Math.max(state.lastReadSeq, seq) };
}

/**
 * 应用一条推送：同 id 不重复；新条目入队首并截断。
 * 属于活动会话的消息直接以已读插入、不加计数（D14）。
 */
export function applyEvent(
  state: NotificationState,
  event: NotificationEvent,
  activeKey: string | null,
): NotificationState {
  const item = event.notification;
  if (state.items.some((existing) => existing.id === item.id)) {
    return state;
  }
  const inActiveConversation =
    item.type === 'message'
    && activeKey !== null
    && activeKey === conversationKey(item.trip_id, item.actor.id);
  const stored = inActiveConversation ? { ...item, read: true } : item;
  const counts = inActiveConversation
    ? state.counts
    : {
        total: state.counts.total + 1,
        application: state.counts.application + (APPLICATION_TYPES.has(item.type) ? 1 : 0),
        message: state.counts.message + (item.type === 'message' ? 1 : 0),
      };
  return {
    items: [stored, ...state.items].slice(0, MAX_NOTIFICATION_ITEMS),
    counts,
    lastReadSeq: state.lastReadSeq,
  };
}

/** 单条标读的乐观归约；已读条目原样返回。 */
export function markOneLocal(state: NotificationState, id: number): NotificationState {
  const target = state.items.find((item) => item.id === id);
  if (target === undefined || target.read) {
    return state;
  }
  return {
    ...state,
    items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    counts: unbump(state.counts, target),
  };
}

/** 全部标读：所有条目置读、计数归零。 */
export function markAllLocal(state: NotificationState): NotificationState {
  if (state.items.every((item) => item.read) && state.counts.total === 0) {
    return state;
  }
  return {
    ...state,
    items: state.items.map((item) => (item.read ? item : { ...item, read: true })),
    counts: emptyCounts(),
  };
}

/** 单会话标读：只清该会话的消息类条目，申请类不动。 */
export function markConversationLocal(
  state: NotificationState,
  tripId: number,
  otherUserId: number,
): NotificationState {
  let cleared = 0;
  const items = state.items.map((item) => {
    const matches =
      !item.read
      && item.type === 'message'
      && item.trip_id === tripId
      && item.actor.id === otherUserId;
    if (!matches) {
      return item;
    }
    cleared += 1;
    return { ...item, read: true };
  });
  if (cleared === 0) {
    return state;
  }
  return {
    ...state,
    items,
    counts: {
      total: Math.max(0, state.counts.total - cleared),
      application: state.counts.application,
      message: Math.max(0, state.counts.message - cleared),
    },
  };
}

/** 每个会话的未读消息数；键为 `"${tripId}:${otherId}"`。 */
export function unreadByConversation(items: AppNotification[]): Map<string, number> {
  const unread = new Map<string, number>();
  items.forEach((item) => {
    if (item.read || item.type !== 'message') {
      return;
    }
    const key = conversationKey(item.trip_id, item.actor.id);
    unread.set(key, (unread.get(key) ?? 0) + 1);
  });
  return unread;
}

/** 条目直达地址：申请类去行程详情，消息类去会话页；未知类型回退行程详情。 */
export function notificationHref(item: AppNotification): string {
  if (item.type === 'message') {
    return `#/chat/${item.trip_id}/${item.actor.id}`;
  }
  return `#/trips/${item.trip_id}`;
}

/** 提示条条件：申请类恒提示；消息类仅在对应会话未打开时提示（D14）。 */
export function shouldToast(item: AppNotification, activeKey: string | null): boolean {
  if (item.type !== 'message') {
    return true;
  }
  return activeKey === null || activeKey !== conversationKey(item.trip_id, item.actor.id);
}

/** 徽标文本：0 隐藏，其余显示原始数字（不截断成 99+）。 */
export function badgeLabel(count: number): string {
  return count > 0 ? String(count) : '';
}