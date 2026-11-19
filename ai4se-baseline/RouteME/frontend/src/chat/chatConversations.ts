import type { ChatPartner, GroupChatSummary } from '../types';
import { conversationKey, groupConversationKey } from '../notifications/notificationModel';

/** 左栏一行会话：一对一或群，键与通知未读口径一致。 */
export type ConversationRow =
  | {
      kind: 'direct';
      key: string;
      tripId: number;
      otherId: number;
      partner: ChatPartner;
      lastAt: string | null;
    }
  | {
      kind: 'group';
      key: string;
      tripId: number;
      group: GroupChatSummary;
      lastAt: string | null;
    };

/**
 * 一对一会话与群会话按最后消息时间倒序混排；无消息的排末尾，
 * 同时间按行程 id 倒序、群在前，保证顺序稳定。
 */
export function mergeConversations(
  partners: ChatPartner[],
  groups: GroupChatSummary[],
): ConversationRow[] {
  const rows: ConversationRow[] = [
    ...partners.map((partner) => ({
      kind: 'direct' as const,
      key: conversationKey(partner.trip.id, partner.other.id),
      tripId: partner.trip.id,
      otherId: partner.other.id,
      partner,
      lastAt: partner.last_message?.sent_at ?? null,
    })),
    ...groups.map((group) => ({
      kind: 'group' as const,
      key: groupConversationKey(group.trip.id),
      tripId: group.trip.id,
      group,
      lastAt: group.last_message?.sent_at ?? null,
    })),
  ];
  rows.sort((left, right) => {
    const leftAt = left.lastAt ?? '';
    const rightAt = right.lastAt ?? '';
    if (leftAt !== rightAt) {
      return leftAt < rightAt ? 1 : -1;
    }
    if (left.tripId !== right.tripId) {
      return right.tripId - left.tripId;
    }
    if (left.kind !== right.kind) {
      return left.kind === 'group' ? -1 : 1;
    }
    return left.kind === 'direct' && right.kind === 'direct'
      ? right.otherId - left.otherId
      : 0;
  });
  return rows;
}