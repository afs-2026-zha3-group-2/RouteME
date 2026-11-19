import { describe, expect, it } from 'vitest';
import { mergeConversations } from './chatConversations';
import { conversationKey, groupConversationKey } from '../notifications/notificationModel';
import type { ChatMessage, ChatPartner, DemoUser, GroupChatSummary, GroupMessage, TripSummary } from '../types';

const user = (id: number): DemoUser => ({
  id,
  nickname: `用户${id}`,
  avatar_initial: `用${id}`,
  bio: '',
  interests: [],
  profile_complete: true,
  student_verified: true,
});

const trip = (id: number): TripSummary => ({
  id,
  title: `行程${id}`,
  destination: '广州市',
  destination_code: '440100',
  province_code: '440000',
  province_name: '广东省',
  start_date: '2026-11-20',
  end_date: '2026-11-20',
  stops: ['甲', '乙'],
  meeting_areas: [],
  meeting_time: null,
  travel_mode: null,
  tags: [],
  capacity: 4,
  joined_count: 2,
  status: 'recruiting',
  ending_soon: false,
  publisher: user(1),
  created_at: '2026-11-10T09:00:00Z',
});

const directMessage = (id: number, sentAt: string): ChatMessage => ({
  id,
  trip_id: 3,
  sender_id: 2,
  receiver_id: 1,
  content: '在吗',
  sent_at: sentAt,
});

const groupMessage = (id: number, sentAt: string): GroupMessage => ({
  id,
  trip_id: 3,
  sender: user(2),
  content: '群里见',
  sent_at: sentAt,
});

const partner = (tripId: number, otherId: number, lastAt: string | null): ChatPartner => ({
  trip: trip(tripId),
  other: user(otherId),
  last_message: lastAt === null ? null : directMessage(1, lastAt),
  message_count: lastAt === null ? 0 : 1,
});

const group = (tripId: number, lastAt: string | null): GroupChatSummary => ({
  trip: trip(tripId),
  member_count: 3,
  last_message: lastAt === null ? null : groupMessage(1, lastAt),
  message_count: lastAt === null ? 0 : 1,
});

describe('mergeConversations', () => {
  it('mixes direct and group rows by last message time, newest first', () => {
    const rows = mergeConversations(
      [partner(3, 2, '2026-11-17T09:00:00Z'), partner(4, 5, '2026-11-17T11:00:00Z')],
      [group(6, '2026-11-17T10:00:00Z')],
    );

    expect(rows.map((row) => row.key)).toEqual([
      conversationKey(4, 5),
      groupConversationKey(6),
      conversationKey(3, 2),
    ]);
    expect(rows.map((row) => row.kind)).toEqual(['direct', 'group', 'direct']);
  });

  it('pushes conversations without messages to the end', () => {
    const rows = mergeConversations(
      [partner(3, 2, null)],
      [group(6, '2026-11-12T09:00:00Z'), group(7, null)],
    );

    expect(rows.map((row) => row.tripId)).toEqual([6, 7, 3]);
    expect(rows[1]?.lastAt).toBeNull();
    expect(rows[2]?.lastAt).toBeNull();
  });

  it('breaks ties by trip id desc, group before direct, then partner id desc', () => {
    const rows = mergeConversations(
      [partner(6, 2, '2026-11-17T09:00:00Z'), partner(6, 4, '2026-11-17T09:00:00Z')],
      [group(6, '2026-11-17T09:00:00Z'), group(5, '2026-11-17T09:00:00Z')],
    );

    expect(rows.map((row) => row.key)).toEqual([
      groupConversationKey(6),
      conversationKey(6, 4),
      conversationKey(6, 2),
      groupConversationKey(5),
    ]);
  });

  it('returns an empty list when there is nothing to chat about', () => {
    expect(mergeConversations([], [])).toEqual([]);
  });
});