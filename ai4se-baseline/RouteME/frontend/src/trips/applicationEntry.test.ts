import { describe, expect, it } from 'vitest';
import { applicationEntryState, applicationErrorMessage } from './applicationEntry';
import { tripMessages } from '../i18n/tripMessages';
import type { ApplicationStatus, DemoUser, TripApplication, TripDetail, TripStatus } from '../types';

const publisher: DemoUser = {
  id: 2,
  nickname: '陈屿',
  avatar_initial: '屿',
  school: '研一 · 地理科学',
  bio: '周末基本在山里。',
  interests: [],
  profile_complete: true,
};

function tripWith(status: TripStatus): Pick<TripDetail, 'status' | 'publisher'> {
  return { status, publisher };
}

function applicationWith(status: ApplicationStatus): TripApplication {
  return { status } as TripApplication;
}

describe('applicationEntryState', () => {
  it('returns publisher for the trip owner', () => {
    expect(applicationEntryState(tripWith('recruiting'), 2, null).kind).toBe('publisher');
  });

  it('returns pending while the application is pending, even when the trip is full', () => {
    expect(applicationEntryState(tripWith('full'), 1, applicationWith('pending')).kind).toBe('pending');
  });

  it('returns accepted while the application is accepted, even when the trip is full', () => {
    expect(applicationEntryState(tripWith('full'), 1, applicationWith('accepted')).kind).toBe('accepted');
  });

  it('returns unavailable with the ended reason for a completed trip', () => {
    expect(applicationEntryState(tripWith('completed'), 1, null)).toEqual({
      kind: 'unavailable',
      reason: tripMessages.applyEnded,
    });
  });

  it('returns unavailable with the full reason for a full trip', () => {
    expect(applicationEntryState(tripWith('full'), 1, null)).toEqual({
      kind: 'unavailable',
      reason: tripMessages.applyFull,
    });
  });

  it('returns apply for a recruiting trip without an active application', () => {
    expect(applicationEntryState(tripWith('recruiting'), 1, null).kind).toBe('apply');
  });

  it('returns apply again after the application is cancelled', () => {
    expect(applicationEntryState(tripWith('recruiting'), 1, applicationWith('cancelled')).kind).toBe('apply');
  });

  it('returns apply again after the application is rejected', () => {
    expect(applicationEntryState(tripWith('recruiting'), 1, applicationWith('rejected')).kind).toBe('apply');
  });
});

describe('applicationErrorMessage', () => {
  it('maps a duplicate application to the waiting message', () => {
    expect(applicationErrorMessage('DUPLICATE_APPLICATION', 'recruiting')).toBe(tripMessages.applyDuplicate);
  });

  it('maps a closed full trip to the full reason', () => {
    expect(applicationErrorMessage('TRIP_NOT_OPEN', 'full')).toBe(tripMessages.applyFull);
  });

  it('maps a closed completed trip to the ended reason', () => {
    expect(applicationErrorMessage('TRIP_NOT_OPEN', 'completed')).toBe(tripMessages.applyEnded);
  });

  it('maps any other closed trip to the generic reason', () => {
    expect(applicationErrorMessage('TRIP_NOT_OPEN', 'recruiting')).toBe(tripMessages.applyUnavailable);
  });

  it('returns null for unknown error codes so the caller can keep the raw code', () => {
    expect(applicationErrorMessage('UNKNOWN_ERROR', 'recruiting')).toBeNull();
  });
});
