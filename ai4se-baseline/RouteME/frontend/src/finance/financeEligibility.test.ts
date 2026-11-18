import { describe, expect, it } from 'vitest';
import type { TripDetail } from '../types';
import {
  FINANCE_OPEN_STATUSES,
  financeEntryVisible,
  financeRoleOf,
  ineligibleMessage,
} from './financeEligibility';

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    id: 3,
    title: '周末海岛',
    destination: '珠海市',
    destination_code: '440400',
    province_code: '440000',
    province_name: '广东省',
    start_date: '2026-11-20',
    end_date: '2026-11-21',
    stops: ['香洲港'],
    meeting_areas: [],
    meeting_time: null,
    travel_mode: 'transit',
    tags: [],
    capacity: 3,
    joined_count: 2,
    status: 'ongoing',
    ending_soon: false,
    publisher: { id: 2 } as TripDetail['publisher'],
    participants: [{ id: 1 }, { id: 2 }] as TripDetail['participants'],
    created_at: '2026-11-01T00:00:00Z',
    note: null,
    budget_min_cents: null,
    budget_max_cents: null,
    completed_at: null,
    cancelled_at: null,
    cancel_reason: null,
    cancel_note: null,
    ...overrides,
  };
}

describe('financeRoleOf', () => {
  it('distinguishes publisher, companion and visitor', () => {
    expect(financeRoleOf(trip(), 2)).toBe('publisher');
    expect(financeRoleOf(trip(), 1)).toBe('companion');
    expect(financeRoleOf(trip(), 99)).toBe('visitor');
  });
});

describe('financeEntryVisible', () => {
  it('shows the entry for participants of recruiting, full and ongoing trips', () => {
    for (const status of FINANCE_OPEN_STATUSES) {
      expect(financeEntryVisible(trip({ status }), 2)).toBe(true);
      expect(financeEntryVisible(trip({ status }), 1)).toBe(true);
    }
  });

  it('hides the entry from visitors', () => {
    expect(financeEntryVisible(trip(), 99)).toBe(false);
  });

  it('hides the entry once the trip is completed or cancelled', () => {
    expect(financeEntryVisible(trip({ status: 'completed' }), 2)).toBe(false);
    expect(financeEntryVisible(trip({ status: 'cancelled' }), 1)).toBe(false);
  });
});

describe('ineligibleMessage', () => {
  it('explains each rejection reason', () => {
    expect(ineligibleMessage('not_participant')).toContain('同行者');
    expect(ineligibleMessage('trip_closed')).toContain('无法');
  });

  it('returns null when the user is eligible', () => {
    expect(ineligibleMessage(null)).toBeNull();
  });
});