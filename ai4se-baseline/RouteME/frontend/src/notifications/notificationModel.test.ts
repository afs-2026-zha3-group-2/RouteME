import { describe, expect, it } from 'vitest';
import {
  applyCounts,
  applyEvent,
  applySnapshot,
  badgeLabel,
  conversationKey,
  emptyCounts,
  isUnread,
  markAllLocal,
  markConversationLocal,
  markOneLocal,
  notificationAvailable,
  notificationHref,
  railBadgeCounts,
  shouldToast,
  typeCount,
  unreadByConversation,
  type NotificationState,
} from './notificationModel';
import { NOTIFICATION_TYPES } from '../types';
import type {
  AppNotification,
  ChatMessage,
  DemoUser,
  NotificationCounts,
  NotificationEvent,
  NotificationList,
  NotificationTarget,
  NotificationType,
} from '../types';

const demoUser = (id: number, nickname = `用户${id}`): DemoUser => ({
  id,
  nickname,
  avatar_initial: nickname.slice(0, 1),
  bio: '',
  interests: [],
  profile_complete: true,
});

const target = (overrides: Partial<NotificationTarget> = {}): NotificationTarget => ({
  kind: 'trip',
  trip_id: 3,
  other_user_id: null,
  application_id: null,
  report_id: null,
  session_id: null,
  ...overrides,
});

const notification = (
  overrides: Partial<AppNotification> & { id: number },
): AppNotification => ({
  type: 'CHAT',
  event: 'message',
  title: '新的同行消息',
  content: '「用户2」发来一条消息（「周末去珠海骑行」）。',
  priority: 'NORMAL',
  status: 'UNREAD',
  read_at: null,
  actor: demoUser(2),
  trip_id: 3,
  trip_title: '周末去珠海骑行',
  application_id: null,
  message_id: null,
  report_id: null,
  session_id: null,
  target: target({
    kind: 'chat',
    trip_id: 3,
    other_user_id: 2,
  }),
  related_available: true,
  created_at: '2026-11-17T09:00:00Z',
  ...overrides,
});

const counts = (
  values: Partial<Record<NotificationType, number>> = {},
  total?: number,
): NotificationCounts => {
  const byType = { ...emptyCounts().by_type, ...values };
  const sum = NOTIFICATION_TYPES.reduce((sum, type) => sum + byType[type], 0);
  return { total: total ?? sum, by_type: byType };
};

const state = (
  items: AppNotification[] = [],
  current = emptyCounts(),
  lastReadSeq = 0,
): NotificationState => ({ items, counts: current, lastReadSeq });

const list = (items: AppNotification[], current = emptyCounts()): NotificationList => ({
  items,
  counts: current,
});

const chatMessage = (id: number): ChatMessage => ({
  id,
  trip_id: 3,
  sender_id: 2,
  receiver_id: 1,
  content: '在吗',
  sent_at: '2026-11-17T09:00:00Z',
});

const event = (
  item: AppNotification,
  message: ChatMessage | null = null,
): NotificationEvent => ({ notification: item, message });

describe('notificationModel', () => {
  describe('F0 counts', () => {
    it('exposes eight counters and zero-fills missing types', () => {
      expect(Object.keys(emptyCounts().by_type)).toEqual([...NOTIFICATION_TYPES]);
      expect(typeCount(counts({ CREDIT: 2 }), 'CREDIT')).toBe(2);
      expect(typeCount(counts(), 'MYSTERY')).toBe(0);
    });
  });

  describe('F1 applySnapshot', () => {
    it('merges local events and the server list by id without duplicates', () => {
      const local = state([notification({ id: 100 })], counts({ CHAT: 1 }));
      const server = list(
        [
          notification({ id: 100, created_at: '2026-11-17T09:01:00Z' }),
          notification({ id: 99, created_at: '2026-11-17T08:59:00Z' }),
        ],
        counts({ CHAT: 1 }),
      );

      const next = applySnapshot(local, server, 1);

      expect(next.items.map((item) => item.id)).toEqual([100, 99]);
      expect(next.counts).toEqual(counts({ CHAT: 1 }));
    });

    it('keeps only the newest fifty entries after merging', () => {
      const local = state([notification({ id: 100, created_at: '2026-11-17T10:00:00Z' })]);
      const serverItems = Array.from({ length: 50 }, (_, index) =>
        notification({
          id: index + 1,
          created_at: `2026-11-17T08:${String(index).padStart(2, '0')}:00Z`,
        }),
      );

      const next = applySnapshot(local, list(serverItems, counts({ CHAT: 50 })), 1);

      expect(next.items).toHaveLength(50);
      expect(next.items[0]?.id).toBe(100);
      expect(next.items.map((item) => item.id)).not.toContain(1);
    });

    it('never turns a locally read entry back to unread', () => {
      const local = state(
        [notification({ id: 7, status: 'READ', read_at: '2026-11-17T09:05:00Z' })],
        counts(),
      );
      const server = list([notification({ id: 7, status: 'UNREAD' })], counts({ CHAT: 1 }));

      const next = applySnapshot(local, server, 1);

      expect(isUnread(next.items[0]!)).toBe(false);
    });

    it('takes the larger value of each type count', () => {
      const local = state([], counts({ CHAT: 3, APPLICATION: 1 }));
      const server = list([], counts({ CHAT: 2, APPLICATION: 1 }));

      expect(applySnapshot(local, server, 1).counts).toEqual(counts({ CHAT: 3, APPLICATION: 1 }));
    });

    it('ignores counts from a snapshot started before the last applied read', () => {
      const local = state([], counts(), 5);
      const server = list(
        [
          notification({ id: 8, created_at: '2026-11-17T09:05:00Z' }),
          notification({
            id: 9,
            type: 'APPLICATION',
            event: 'application_received',
            created_at: '2026-11-17T09:00:00Z',
          }),
        ],
        counts({ CHAT: 1, APPLICATION: 1 }),
      );

      const next = applySnapshot(local, server, 4);

      expect(next.items.map((item) => item.id)).toEqual([8, 9]);
      expect(next.counts).toEqual(counts());
    });

    it('adopts counts when the snapshot was started after the last read', () => {
      const local = state([], counts(), 5);

      expect(applySnapshot(local, list([notification({ id: 8 })], counts({ CHAT: 1 })), 6).counts)
        .toEqual(counts({ CHAT: 1 }));
    });
  });

  describe('F1 applyCounts', () => {
    it('overrides counts and records the read sequence', () => {
      const local = state([notification({ id: 7 })], counts({ CHAT: 1 }));

      const next = applyCounts(local, counts(), 9);

      expect(next.counts).toEqual(counts());
      expect(next.lastReadSeq).toBe(9);
    });
  });

  describe('F2 applyEvent', () => {
    it('puts a new event at the head and increments its type count', () => {
      const local = state([notification({ id: 7 })], counts({ CHAT: 1 }));

      const next = applyEvent(
        local,
        event(notification({ id: 8, created_at: '2026-11-17T09:05:00Z' })),
        null,
      );

      expect(next.items.map((item) => item.id)).toEqual([8, 7]);
      expect(next.counts).toEqual(counts({ CHAT: 2 }));
    });

    it('counts an application event in the application bucket', () => {
      const local = state([], counts());

      const next = applyEvent(
        local,
        event(
          notification({
            id: 9,
            type: 'APPLICATION',
            event: 'application_received',
            application_id: 41,
            target: target({ kind: 'applications', application_id: 41 }),
          }),
        ),
        null,
      );

      expect(next.counts).toEqual(counts({ APPLICATION: 1 }));
    });

    it('does not change state for an event already in the list', () => {
      const local = state([notification({ id: 7 })], counts({ CHAT: 1 }));

      expect(applyEvent(local, event(notification({ id: 7 })), null)).toBe(local);
    });

    it('marks a message from the active conversation as read without counting it', () => {
      const local = state([], counts());

      const next = applyEvent(
        local,
        event(
          notification({
            id: 10,
            trip_id: 3,
            actor: demoUser(2),
            target: target({ kind: 'chat', trip_id: 3, other_user_id: 2 }),
          }),
          chatMessage(55),
        ),
        conversationKey(3, 2),
      );

      expect(isUnread(next.items[0]!)).toBe(false);
      expect(next.counts).toEqual(counts());
    });

    it('counts a message from another conversation', () => {
      const local = state([], counts());

      const next = applyEvent(
        local,
        event(
          notification({
            id: 11,
            trip_id: 3,
            actor: demoUser(4),
            target: target({ kind: 'chat', trip_id: 3, other_user_id: 4 }),
          }),
        ),
        conversationKey(3, 2),
      );

      expect(isUnread(next.items[0]!)).toBe(true);
      expect(next.counts).toEqual(counts({ CHAT: 1 }));
    });

    it('counts a high-priority credit event without needing a conversation', () => {
      const local = state([], counts());

      const next = applyEvent(
        local,
        event(
          notification({
            id: 12,
            type: 'CREDIT',
            event: 'credit_changed',
            priority: 'HIGH',
            actor: null,
            trip_id: null,
            target: target({ kind: 'credit', trip_id: null }),
          }),
        ),
        conversationKey(3, 2),
      );

      expect(next.counts).toEqual(counts({ CREDIT: 1 }));
    });
  });

  describe('F3 local mark-read', () => {
    it('decrements the matching buckets when reading one notification', () => {
      const local = state(
        [
          notification({
            id: 7,
            type: 'APPLICATION',
            event: 'application_received',
            actor: demoUser(2),
          }),
          notification({ id: 8 }),
        ],
        counts({ APPLICATION: 1, CHAT: 1 }),
      );

      const next = markOneLocal(local, 8);

      expect(isUnread(next.items.find((item) => item.id === 8)!)).toBe(false);
      expect(next.counts).toEqual(counts({ APPLICATION: 1 }));
    });

    it('is idempotent for an already read notification', () => {
      const local = state([notification({ id: 7, status: 'READ' })], counts());

      expect(markOneLocal(local, 7)).toBe(local);
    });

    it('zeroes every count and marks all entries read', () => {
      const local = state(
        [
          notification({
            id: 7,
            type: 'APPLICATION',
            event: 'application_accepted',
          }),
          notification({ id: 8 }),
        ],
        counts({ APPLICATION: 1, CHAT: 1 }),
      );

      const next = markAllLocal(local);

      expect(next.counts).toEqual(counts());
      expect(next.items.every((item) => !isUnread(item))).toBe(true);
    });

    it('only clears the matching conversation', () => {
      const local = state(
        [
          notification({ id: 7, trip_id: 3, actor: demoUser(2) }),
          notification({ id: 8, trip_id: 3, actor: demoUser(2) }),
          notification({ id: 9, trip_id: 3, actor: demoUser(4) }),
          notification({ id: 10, trip_id: 5, actor: demoUser(2) }),
          notification({
            id: 11,
            trip_id: 3,
            actor: demoUser(2),
            type: 'APPLICATION',
            event: 'application_received',
          }),
        ],
        counts({ CHAT: 4, APPLICATION: 1 }),
      );

      const next = markConversationLocal(local, 3, 2);

      expect(next.items.filter((item) => !isUnread(item)).map((item) => item.id)).toEqual([7, 8]);
      expect(next.counts).toEqual(counts({ CHAT: 2, APPLICATION: 1 }));
    });

    it('keeps the conversation state when nothing matches', () => {
      const local = state(
        [notification({ id: 7, trip_id: 3, actor: demoUser(2) })],
        counts({ CHAT: 1 }),
      );

      expect(markConversationLocal(local, 9, 2)).toBe(local);
    });
  });

  describe('F4 unreadByConversation', () => {
    it('groups unread chat messages per conversation and ignores other types', () => {
      const items = [
        notification({ id: 1, trip_id: 3, actor: demoUser(2) }),
        notification({ id: 2, trip_id: 3, actor: demoUser(2) }),
        notification({ id: 3, trip_id: 3, actor: demoUser(4) }),
        notification({ id: 4, trip_id: 5, actor: demoUser(2), status: 'READ' }),
        notification({
          id: 5,
          trip_id: 3,
          actor: demoUser(2),
          type: 'APPLICATION',
          event: 'application_received',
        }),
      ];

      const unread = unreadByConversation(items);

      expect(unread.get('3:2')).toBe(2);
      expect(unread.get('3:4')).toBe(1);
      expect(unread.has('5:2')).toBe(false);
    });
  });

  describe('F5 notificationHref / availability', () => {
    it('maps every target kind to its page', () => {
      expect(
        notificationHref(
          notification({ id: 1, type: 'TRIP', event: 'trip_full', target: target() }),
        ),
      ).toBe('#/trips/3');
      expect(
        notificationHref(
          notification({
            id: 1,
            type: 'APPLICATION',
            event: 'application_received',
            application_id: 41,
            target: target({ kind: 'applications', application_id: 41 }),
          }),
        ),
      ).toBe('#/trips/3/applications');
      expect(
        notificationHref(
          notification({
            id: 1,
            target: target({ kind: 'chat', trip_id: 12, other_user_id: 9 }),
          }),
        ),
      ).toBe('#/chat/12/9');
      expect(
        notificationHref(
          notification({
            id: 1,
            type: 'CREDIT',
            event: 'credit_changed',
            target: target({ kind: 'credit', trip_id: null }),
          }),
        ),
      ).toBe('#/credit/records');
      expect(
        notificationHref(
          notification({
            id: 1,
            type: 'REPORT',
            event: 'report_resolved',
            report_id: 42,
            target: target({ kind: 'report', trip_id: null, report_id: 42 }),
          }),
        ),
      ).toBe('#/reports/42');
      expect(
        notificationHref(
          notification({
            id: 1,
            type: 'ACCOUNT',
            event: 'account_banned',
            target: target({ kind: 'account', trip_id: null }),
          }),
          7,
        ),
      ).toBe('#/users/7');
      expect(
        notificationHref(
          notification({
            id: 1,
            type: 'SERVICE',
            event: 'service_reply',
            target: target({ kind: 'support', trip_id: null, session_id: 5 }),
          }),
        ),
      ).toBe('#/support');
      expect(
        notificationHref(
          notification({
            id: 1,
            type: 'SYSTEM',
            event: 'identity_verified',
            target: target({ kind: 'identity', trip_id: null }),
          }),
        ),
      ).toBe('#/profile/setup');
    });

    it('falls back to the notification centre for unknown targets', () => {
      expect(
        notificationHref(
          notification({
            id: 1,
            target: target({ kind: 'planet' as NotificationTarget['kind'] }),
          }),
        ),
      ).toBe('#/notifications');
    });

    it('reports unavailable related objects without throwing', () => {
      expect(notificationAvailable(notification({ id: 1 }))).toBe(true);
      expect(
        notificationAvailable(notification({ id: 1, related_available: false })),
      ).toBe(false);
    });
  });

  describe('F6 shouldToast', () => {
    it('always toasts non-chat events', () => {
      const item = notification({
        id: 1,
        type: 'APPLICATION',
        event: 'application_rejected',
      });

      expect(shouldToast(item, null)).toBe(true);
      expect(shouldToast(item, conversationKey(3, 2))).toBe(true);
    });

    it('toasts messages outside the active conversation', () => {
      const item = notification({ id: 1, trip_id: 3, actor: demoUser(2) });

      expect(shouldToast(item, null)).toBe(true);
      expect(shouldToast(item, conversationKey(3, 4))).toBe(true);
    });

    it('suppresses the toast for the active conversation', () => {
      const item = notification({ id: 1, trip_id: 3, actor: demoUser(2) });

      expect(shouldToast(item, conversationKey(3, 2))).toBe(false);
    });
  });

  describe('F7 badgeLabel', () => {
    it('hides zero and shows the raw number otherwise', () => {
      expect(badgeLabel(0)).toBe('');
      expect(badgeLabel(1)).toBe('1');
      expect(badgeLabel(12)).toBe('12');
      expect(badgeLabel(120)).toBe('120');
    });
  });

  describe('F8 defensive handling of unknown types', () => {
    it('does not throw for grouping, routing or toasting', () => {
      const item = notification({
        id: 1,
        type: 'something_else',
        trip_id: 3,
        target: target(),
      });

      expect(() => unreadByConversation([item])).not.toThrow();
      expect(() => shouldToast(item, conversationKey(3, 2))).not.toThrow();
      expect(shouldToast(item, conversationKey(3, 2))).toBe(true);
    });
  });
});

describe('railBadgeCounts', () => {
  it('splits eight types across four rail entries that add up to the total', () => {
    const counts: NotificationCounts = {
      total: 38,
      by_type: {
        TRIP: 5,
        APPLICATION: 14,
        CHAT: 5,
        CREDIT: 2,
        REPORT: 3,
        ACCOUNT: 2,
        SERVICE: 3,
        SYSTEM: 4,
      },
    };

    const badges = railBadgeCounts(counts);

    expect(badges).toEqual({ trips: 19, chat: 5, support: 3, account: 11 });
    expect(badges.trips + badges.chat + badges.support + badges.account).toBe(counts.total);
  });

  it('keeps the four entries at zero for an empty inbox', () => {
    expect(railBadgeCounts(emptyCounts())).toEqual({
      trips: 0,
      chat: 0,
      support: 0,
      account: 0,
    });
  });

  it('routes non-trip, non-chat, non-service types to the account entry', () => {
    const counts = emptyCounts();
    counts.by_type.SYSTEM = 4;

    expect(railBadgeCounts(counts)).toEqual({
      trips: 0,
      chat: 0,
      support: 0,
      account: 4,
    });
  });
});