import type { TripDetail, TripStatus } from '../types';

export type ShareEligibility =
  | { kind: 'ready' }
  | { kind: 'notCompleted'; status: TripStatus }
  | { kind: 'notParticipant' };

export function shareEligibility(
  trip: Pick<TripDetail, 'status' | 'participants'>,
  userId: number,
): ShareEligibility {
  if (trip.status !== 'completed') {
    return { kind: 'notCompleted', status: trip.status };
  }
  if (!trip.participants.some((member) => member.id === userId)) {
    return { kind: 'notParticipant' };
  }
  return { kind: 'ready' };
}