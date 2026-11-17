import { describe, expect, it } from 'vitest';
import { shareEligibility } from './shareEligibility';
import type { DemoUser, TripDetail } from '../types';

function trip(status: TripDetail['status'], participantIds: number[]): Pick<TripDetail, 'status' | 'participants'> {
  return {
    status,
    participants: participantIds.map((id) => ({ id }) as DemoUser),
  };
}

describe('shareEligibility', () => {
  it('allows a participant of a completed trip', () => {
    expect(shareEligibility(trip('completed', [1, 2]), 2)).toEqual({ kind: 'ready' });
  });

  it('rejects a trip that is still ongoing', () => {
    expect(shareEligibility(trip('ongoing', [1]), 1)).toEqual({
      kind: 'notCompleted',
      status: 'ongoing',
    });
  });

  it('reports the trip status before the participation check', () => {
    expect(shareEligibility(trip('recruiting', [2]), 1)).toEqual({
      kind: 'notCompleted',
      status: 'recruiting',
    });
  });

  it('rejects a cancelled trip with its status', () => {
    expect(shareEligibility(trip('cancelled', [1]), 1)).toEqual({
      kind: 'notCompleted',
      status: 'cancelled',
    });
  });

  it('rejects a completed trip the user did not join', () => {
    expect(shareEligibility(trip('completed', [2]), 1)).toEqual({ kind: 'notParticipant' });
  });
});