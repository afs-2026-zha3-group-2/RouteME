import type { FinanceIneligibleReason, TripStatus } from '../types';

/** 可交易的行程状态：进行中、满员与招募中才能购买保险 / 借款。 */
export const FINANCE_OPEN_STATUSES: readonly TripStatus[] = ['recruiting', 'full', 'ongoing'];

export type FinanceParticipantContext = {
  status: TripStatus;
  publisher: { id: number };
  participants: { id: number }[];
};

/** 行程维度入口的角色：发布者、已接受同行者，或无关路人。 */
export type FinanceRole = 'publisher' | 'companion' | 'visitor';

export function financeRoleOf(trip: FinanceParticipantContext, userId: number): FinanceRole {
  if (trip.publisher.id === userId) {
    return 'publisher';
  }
  return trip.participants.some((participant) => participant.id === userId)
    ? 'companion'
    : 'visitor';
}

/**
 * 行程详情「旅行保障」区块的可见性：仅发布者 / 已接受同行者，且行程未结束。
 * 服务端 `GET /trips/{tripId}/finance` 仍是资格的最终判定。
 */
export function financeEntryVisible(trip: FinanceParticipantContext, userId: number): boolean {
  return FINANCE_OPEN_STATUSES.includes(trip.status) && financeRoleOf(trip, userId) !== 'visitor';
}

/** 无资格原因 → 中文说明；有资格时返回 null。 */
export function ineligibleMessage(reason: FinanceIneligibleReason | null): string | null {
  if (reason === 'not_participant') {
    return '只有该行程的发布者或已接受的同行者才能购买保障或借款。';
  }
  if (reason === 'trip_closed') {
    return '行程已结束或已取消，无法再购买保障或借款。';
  }
  return null;
}