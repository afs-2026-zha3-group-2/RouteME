import { tripMessages } from '../i18n/tripMessages';
import type { TripApplication, TripDetail } from '../types';

export type ApplicationEntryKind = 'publisher' | 'pending' | 'accepted' | 'apply' | 'unavailable';

export type ApplicationEntry =
  | { kind: 'publisher' }
  | { kind: 'pending'; application: TripApplication }
  | { kind: 'accepted'; application: TripApplication }
  | { kind: 'apply' }
  | { kind: 'unavailable'; reason: string };

type TripContext = Pick<TripDetail, 'status' | 'publisher' | 'joined_count' | 'capacity'>;

/**
 * 申请状态优先于行程状态：满员后已匹配的用户仍需要聊天与退出入口。
 */
export function applicationEntryState(
  trip: TripContext,
  userId: number,
  application: TripApplication | null,
): ApplicationEntry {
  if (trip.publisher.id === userId) {
    return { kind: 'publisher' };
  }
  if (application?.status === 'pending') {
    return { kind: 'pending', application };
  }
  if (application?.status === 'accepted') {
    return { kind: 'accepted', application };
  }
  if (trip.status === 'completed') {
    return { kind: 'unavailable', reason: tripMessages.applyEnded };
  }
  if (trip.status === 'full' || trip.joined_count >= trip.capacity) {
    return { kind: 'unavailable', reason: tripMessages.applyFull };
  }
  return { kind: 'apply' };
}

/**
 * 只映射申请提交的两个已知 409；未知错误返回 null，让调用方保留原始错误码。
 */
export function applicationErrorMessage(code: string, trip: TripContext): string | null {
  if (code === 'DUPLICATE_APPLICATION') {
    return tripMessages.applyDuplicate;
  }
  if (code === 'TRIP_NOT_OPEN') {
    if (trip.status === 'completed') {
      return tripMessages.applyEnded;
    }
    if (trip.status === 'full' || trip.joined_count >= trip.capacity) {
      return tripMessages.applyFull;
    }
    return tripMessages.applyUnavailable;
  }
  return null;
}
