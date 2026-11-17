import { describe, expect, it } from 'vitest';
import {
  applyCounts,
  applyEvent,
  applySnapshot,
  badgeLabel,
  conversationKey,
  emptyCounts,
  markAllLocal,
  markConversationLocal,
  markOneLocal,
  notificationHref,
  shouldToast,
  unreadByConversation,
  type NotificationState,
} from './notificationModel';
import type {
  AppNotification,
  ChatMessage,
  DemoUser,
  NotificationCounts,
  NotificationEvent,
  NotificationList,
} from '../types';

const demoUser = (id: number, nickname = `用户${id}`): DemoUser => ({
  id,
  nickname,
  avatar_initial: nickname.slice(0, 1),
  bio: '',
  interests: [],
  profile_complete: true,
});

const notification = (
  overrides: Partial<AppNotification> & { id: number },
): AppNotification => ({
  type: 'message',
  actor: demoUser(2),
  trip_id: 3,
  trip_title: '周末去珠海骑行',
  application_id: null,
  message_id: null,
  text: '「用户2」发来一条消息（「周末去珠海骑行」）',
  created_at: '2026-11-17T09:00:00Z',
  read: false,
  ...overrides,
});

const counts = (total: number, application: number, message: number): NotificationCounts => ({
  total,
  application,
  message,
});

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
  describe('F1 applySnapshot', () => {
    it('merges local events and the server list by id without duplicates', () => {
      const local = state([notification({ id: 100 })], counts(1, 0, 1));
      const server = list([
        notification({ id: 100, created_at: '2026-11-17T09:01:00Z' }),
        notification({ id: 99, created_at: '2026-11-17T08:59:00Z' }),
      ]);

      const next = applySnapshot(local, server, 1);

      expect(next.items.map((item) => item.id)).toEqual([100, 99]);
      expect(next.counts).toEqual(counts(1, 0, 1));
    });

    it('keeps only the newest fifty entries after merging', () => {
      const local = state([notification({ id: 100, created_at: '2026-11-17T10:00:00Z' })]);
      const serverItems = Array.from({ length: 50 }, (_, index) =>
        notification({
          id: index + 1,
          created_at: `2026-11-17T08:${String(index).padStart(2, '0')}:00Z`,
        }),
      );

      const next = applySnapshot(local, list(serverItems), 1);

      expect(next.items).toHaveLength(50);
      expect(next.items[0]?.id).toBe(100);
      expect(next.items.map((item) => item.id)).not.toContain(1);
    });

    it('never turns a locally read entry back to unread', () => {
      const local = state([notification({ id: 7, read: true })], counts(0, 0, 0));
      const server = list([notification({ id: 7, read: false })], counts(1, 0, 1));

      const next = applySnapshot(local, server, 1);

      expect(next.items.find((item) => item.id === 7)?.read).toBe(true);
    });

    it('takes the larger value of each count field', () => {
      const local = state([], counts(4, 1, 3));
      const server = list([], counts(3, 1, 2));

      expect(applySnapshot(local, server, 1).counts).toEqual(counts(4, 1, 3));
    });

    it('ignores counts from a snapshot started before the last applied read', () => {
      const local = state([], counts(0, 0, 0), 5);
      const server = list(
        [
          notification({ id: 8, created_at: '2026-11-17T09:05:00Z' }),
          notification({ id: 9, type: 'application_received', created_at: '2026-11-17T09:00:00Z' }),
        ],
        counts(2, 1, 1),
      );

      const next = applySnapshot(local, server, 4);

      expect(next.items.map((item) => item.id)).toEqual([8, 9]);
      expect(next.counts).toEqual(counts(0, 0, 0));
    });

    it('adopts counts when the snapshot was started after the last read', () => {
      const local = state([], counts(0, 0, 0), 5);
      const server = list([notification({ id: 8 })], counts(1, 0, 1));

      expect(applySnapshot(local, server, 6).counts).toEqual(counts(1, 0, 1));
    });
  });

  describe('F1 applyCounts', () => {
    it('overrides counts and records the read sequence', () => {
      const local = state([notification({ id: 7 })], counts(1, 0, 1));

      const next = applyCounts(local, counts(0, 0, 0), 9);

      expect(next.counts).toEqual(counts(0, 0, 0));
      expect(next.lastReadSeq).toBe(9);
    });
  });

  describe('F2 applyEvent', () => {
    it('puts a new event at the head and increments its type count', () => {
      const local = state([notification({ id: 7 })], counts(1, 0, 1));

      const next = applyEvent(
        local,
        event(notification({ id: 8, created_at: '2026-11-17T09:05:00Z' })),
        null,
      );

      expect(next.items.map((item) => item.id)).toEqual([8, 7]);
      expect(next.counts).toEqual(counts(2, 0, 2));
    });

    it('counts an application event in the application bucket', () => {
      const local = state([], counts(0, 0, 0));

      const next = applyEvent(
        local,
        event(notification({ id: 9, type: 'application_received', application_id: 41 })),
        null,
      );

      expect(next.counts).toEqual(counts(1, 1, 0));
    });

    it('does not change state for an event already in the list', () => {
      const local = state([notification({ id: 7 })], counts(1, 0, 1));

      const next = applyEvent(local, event(notification({ id: 7 })), null);

      expect(next).toBe(local);
    });

    it('marks a message from the active conversation as read without counting it', () => {
      const local = state([], counts(0, 0, 0));

      const next = applyEvent(
        local,
        event(notification({ id: 10, trip_id: 3, actor: demoUser(2) }), chatMessage(55)),
        conversationKey(3, 2),
      );

      expect(next.items[0]?.read).toBe(true);
      expect(next.counts).toEqual(counts(0, 0, 0));
    });

    it('counts a message from another conversation', () => {
      const local = state([], counts(0, 0, 0));

      const next = applyEvent(
        local,
        event(notification({ id: 11, trip_id: 3, actor: demoUser(4) })),
        conversationKey(3, 2),
      );

      expect(next.items[0]?.read).toBe(false);
      expect(next.counts).toEqual(counts(1, 0, 1));
    });
  });

  describe('F3 local mark-read', () => {
    it('decrements the matching buckets when reading one notification', () => {
      const local = state(
        [
          notification({ id: 7, type: 'application_received' }),
          notification({ id: 8 }),
        ],
        counts(2, 1, 1),
      );

      const next = markOneLocal(local, 8);

      expect(next.items.find((item) => item.id === 8)?.read).toBe(true);
      expect(next.counts).toEqual(counts(1, 1, 0));
    });

    it('is idempotent for an already read notification', () => {
      const local = state([notification({ id: 7, read: true })], counts(0, 0, 0));

      expect(markOneLocal(local, 7)).toBe(local);
    });

    it('zeroes every count and marks all entries read', () => {
      const local = state(
        [
          notification({ id: 7, type: 'application_accepted' }),
          notification({ id: 8 }),
        ],
        counts(2, 1, 1),
      );

      const next = markAllLocal(local);

      expect(next.counts).toEqual(counts(0, 0, 0));
      expect(next.items.every((item) => item.read)).toBe(true);
    });

    it('only clears the matching conversation', () => {
      const local = state(
        [
          notification({ id: 7, trip_id: 3, actor: demoUser(2) }),
          notification({ id: 8, trip_id: 3, actor: demoUser(2) }),
          notification({ id: 9, trip_id: 3, actor: demoUser(4) }),
          notification({ id: 10, trip_id: 5, actor: demoUser(2) }),
          notification({ id: 11, trip_id: 3, actor: demoUser(2), type: 'application_received' }),
        ],
        counts(5, 1, 4),
      );

      const next = markConversationLocal(local, 3, 2);

      expect(next.items.filter((item) => item.read).map((item) => item.id)).toEqual([7, 8]);
      expect(next.counts).toEqual(counts(3, 1, 2));
    });

    it('keeps the conversation state when nothing matches', () => {
      const local = state([notification({ id: 7, trip_id: 3, actor: demoUser(2) })], counts(1, 0, 1));

      expect(markConversationLocal(local, 9, 2)).toBe(local);
    });
  });

  describe('F4 unreadByConversation', () => {
    it('groups unread messages per conversation and ignores applications', () => {
      const items = [
        notification({ id: 1, trip_id: 3, actor: demoUser(2) }),
        notification({ id: 2, trip_id: 3, actor: demoUser(2) }),
        notification({ id: 3, trip_id: 3, actor: demoUser(4) }),
        notification({ id: 4, trip_id: 5, actor: demoUser(2), read: true }),
        notification({
          id: 5,
          trip_id: 3,
          actor: demoUser(2),
          type: 'application_received',
        }),
      ];

      const unread = unreadByConversation(items);

      expect(unread.get('3:2')).toBe(2);
      expect(unread.get('3:4')).toBe(1);
      expect(unread.has('5:2')).toBe(false);
    });
  });

  describe('F5 notificationHref', () => {
    it('points application events at the trip page', () => {
      expect(
        notificationHref(notification({ id: 1, type: 'application_accepted', trip_id: 12 })),
      ).toBe('#/trips/12');
    });

    it('points message events at the conversation page', () => {
      expect(
        notificationHref(notification({ id: 1, trip_id: 12, actor: demoUser(9) })),
      ).toBe('#/chat/12/9');
    });
  });

  describe('F6 shouldToast', () => {
    it('always toasts application events', () => {
      const item = notification({ id: 1, type: 'application_rejected' });

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
      const item = notification({ id: 1, type: 'something_else', trip_id: 3 });

      expect(() => unreadByConversation([item])).not.toThrow();
      expect(notificationHref(item)).toBe('#/trips/3');
      expect(() => shouldToast(item, conversationKey(3, 2))).not.toThrow();
    });
  });
});