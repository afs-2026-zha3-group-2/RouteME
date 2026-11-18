import {
  NOTIFICATION_TYPES,
  type AppNotification,
  type NotificationCounts,
  type NotificationEvent,
  type NotificationList,
  type NotificationType,
} from '../types';

/** 列表展示上限，与后端 `maxItems=50` 一致。 */
export const MAX_NOTIFICATION_ITEMS = 50;

/** 四处徽标共用的一份状态；`lastReadSeq` 是「在途快照」护栏（design §6.1 / R-9）。 */
export type NotificationState = {
  items: AppNotification[];
  counts: NotificationCounts;
  lastReadSeq: number;
};

const KNOWN_TYPES = new Set<string>(NOTIFICATION_TYPES);

/** 空计数；每次新建对象，避免调用方共享可变状态。 */
export function emptyCounts(): NotificationCounts {
  return {
    total: 0,
    by_type: {
      TRIP: 0,
      APPLICATION: 0,
      CHAT: 0,
      CREDIT: 0,
      REPORT: 0,
      ACCOUNT: 0,
      SERVICE: 0,
      SYSTEM: 0,
    },
  };
}

/** 某一类型的未读数；未知类型按 0 处理。 */
export function typeCount(counts: NotificationCounts, type: string): number {
  if (!KNOWN_TYPES.has(type)) {
    return 0;
  }
  return counts.by_type[type as NotificationType] ?? 0;
}

/** 状态由后端下发；防御性兼容只带 `read_at` 的旧载荷。 */
export function isUnread(item: AppNotification): boolean {
  return item.status === 'READ' ? false : true;
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

/** 两个计数逐项取较大值；总数同时不小于各类型之和，避免拆分与总数互相矛盾。 */
function mergeCounts(local: NotificationCounts, incoming: NotificationCounts): NotificationCounts {
  const byType = emptyCounts().by_type;
  NOTIFICATION_TYPES.forEach((type) => {
    byType[type] = Math.max(local.by_type[type] ?? 0, incoming.by_type[type] ?? 0);
  });
  const sum = NOTIFICATION_TYPES.reduce((total, type) => total + byType[type], 0);
  return {
    total: Math.max(sum, local.total, incoming.total),
    by_type: byType,
  };
}

function bump(counts: NotificationCounts, type: string): NotificationCounts {
  const byType = { ...counts.by_type };
  if (KNOWN_TYPES.has(type)) {
    byType[type as NotificationType] += 1;
  }
  return { total: counts.total + 1, by_type: byType };
}

function unbump(counts: NotificationCounts, type: string): NotificationCounts {
  const byType = { ...counts.by_type };
  if (KNOWN_TYPES.has(type)) {
    byType[type as NotificationType] = Math.max(0, byType[type as NotificationType] - 1);
  }
  return { total: Math.max(0, counts.total - 1), by_type: byType };
}

/**
 * 合并 REST 快照与本地推送：按 id 去重、已读单调、保留最新 50 条。
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
    if (local === undefined) {
      byId.set(item.id, item);
      return;
    }
    const read = !isUnread(local) || !isUnread(item);
    byId.set(item.id, {
      ...item,
      status: read ? 'READ' : 'UNREAD',
      read_at: read ? local.read_at ?? item.read_at : null,
    });
  });
  const counts = state.lastReadSeq > seq ? state.counts : mergeCounts(state.counts, list.counts);
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
 * 属于活动会话的聊天消息直接以已读插入、不加计数（D14）。
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
    item.type === 'CHAT'
    && activeKey !== null
    && item.trip_id !== null
    && item.actor !== null
    && activeKey === conversationKey(item.trip_id, item.actor.id);
  const stored = inActiveConversation
    ? { ...item, status: 'READ' as const, read_at: item.read_at ?? item.created_at }
    : item;
  return {
    items: [stored, ...state.items].slice(0, MAX_NOTIFICATION_ITEMS),
    counts: inActiveConversation ? state.counts : bump(state.counts, item.type),
    lastReadSeq: state.lastReadSeq,
  };
}

/** 单条标读的乐观归约；已读条目原样返回。 */
export function markOneLocal(state: NotificationState, id: number): NotificationState {
  const target = state.items.find((item) => item.id === id);
  if (target === undefined || !isUnread(target)) {
    return state;
  }
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === id
        ? { ...item, status: 'READ' as const, read_at: item.read_at ?? item.created_at }
        : item,
    ),
    counts: unbump(state.counts, target.type),
  };
}

/** 全部标读：所有条目置读、计数归零。 */
export function markAllLocal(state: NotificationState): NotificationState {
  if (state.items.every((item) => !isUnread(item)) && state.counts.total === 0) {
    return state;
  }
  return {
    ...state,
    items: state.items.map((item) =>
      isUnread(item)
        ? { ...item, status: 'READ' as const, read_at: item.read_at ?? item.created_at }
        : item,
    ),
    counts: emptyCounts(),
  };
}

/** 单会话标读：只清该会话的聊天类条目，其他类型不动。 */
export function markConversationLocal(
  state: NotificationState,
  tripId: number,
  otherUserId: number,
): NotificationState {
  let cleared = 0;
  const items = state.items.map((item) => {
    const matches =
      isUnread(item)
      && item.type === 'CHAT'
      && item.trip_id === tripId
      && item.actor !== null
      && item.actor.id === otherUserId;
    if (!matches) {
      return item;
    }
    cleared += 1;
    return { ...item, status: 'READ' as const, read_at: item.read_at ?? item.created_at };
  });
  if (cleared === 0) {
    return state;
  }
  const byType = { ...state.counts.by_type };
  byType.CHAT = Math.max(0, byType.CHAT - cleared);
  return {
    ...state,
    items,
    counts: {
      total: Math.max(0, state.counts.total - cleared),
      by_type: byType,
    },
  };
}

/** 每个会话的未读消息数；键为 `"${tripId}:${otherId}"`。 */
export function unreadByConversation(items: AppNotification[]): Map<string, number> {
  const unread = new Map<string, number>();
  items.forEach((item) => {
    if (!isUnread(item) || item.type !== 'CHAT' || item.trip_id === null || item.actor === null) {
      return;
    }
    const key = conversationKey(item.trip_id, item.actor.id);
    unread.set(key, (unread.get(key) ?? 0) + 1);
  });
  return unread;
}

/**
 * 条目直达地址：由后端下发的 `target.kind` 决定，未知目标回到通知中心。
 *
 * @param viewerId 本人 id，仅 `account` 目标需要；缺省时回退到资料页。
 */
export function notificationHref(item: AppNotification, viewerId?: number): string {
  const target = item.target;
  if (target === undefined || target === null) {
    return '#/notifications';
  }
  switch (target.kind) {
    case 'trip':
      return target.trip_id === null ? '#/notifications' : `#/trips/${target.trip_id}`;
    case 'applications':
      return target.trip_id === null
        ? '#/notifications'
        : `#/trips/${target.trip_id}/applications`;
    case 'chat':
      return target.trip_id === null || target.other_user_id === null
        ? '#/notifications'
        : `#/chat/${target.trip_id}/${target.other_user_id}`;
    case 'credit':
      return '#/credit/records';
    case 'report':
      return target.report_id === null ? '#/notifications' : `#/reports/${target.report_id}`;
    case 'account':
      return viewerId === undefined ? '#/profile/setup' : `#/users/${viewerId}`;
    case 'support':
      return '#/support';
    case 'identity':
      return '#/profile/setup';
    default:
      return '#/notifications';
  }
}

/** 关联业务是否仍可访问；不可访问时保留正文，只提示不可跳转。 */
export function notificationAvailable(item: AppNotification): boolean {
  return item.related_available !== false;
}

/** 提示条条件：聊天类仅在对应会话未打开时提示；其余类型恒提示（D14）。 */
export function shouldToast(item: AppNotification, activeKey: string | null): boolean {
  if (item.type !== 'CHAT') {
    return true;
  }
  if (item.trip_id === null || item.actor === null) {
    return true;
  }
  return activeKey === null || activeKey !== conversationKey(item.trip_id, item.actor.id);
}

/** 徽标文本：0 隐藏，其余显示原始数字（不截断成 99+）。 */
export function badgeLabel(count: number): string {
  return count > 0 ? String(count) : '';
}