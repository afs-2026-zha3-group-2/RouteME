import { describe, expect, it } from 'vitest';
import type { MyTrips, TripApplication, TripSummary } from '../types';
import {
  actionsFor,
  applicationCancelCause,
  dayLabel,
  formatDateRange,
  groupApplied,
  groupCounts,
  pendingCountFor,
  pendingTargetTripId,
} from './mineTrips';

function trip(id: number, overrides: Partial<TripSummary> = {}): TripSummary {
  return {
    id,
    title: `行程 ${id}`,
    destination: '深圳',
    destination_code: '440300',
    province_code: '440000',
    province_name: '广东省',
    start_date: '2026-11-20',
    end_date: '2026-11-22',
    stops: ['a', 'b'],
    tags: [],
    capacity: 4,
    joined_count: 2,
    meeting_areas: [],
    meeting_time: null,
    travel_mode: null,
    status: 'recruiting',
    ending_soon: false,
    publisher: {
      id: 9,
      nickname: '发布者',
      avatar_initial: '发',
      bio: '',
      interests: [],
      profile_complete: true,
      student_verified: true,
    },
    created_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

function application(
  status: TripApplication['status'],
  tripSummary = trip(3),
  overrides: Partial<TripApplication> = {},
): TripApplication {
  return {
    id: 1,
    trip_id: tripSummary.id,
    applicant: tripSummary.publisher,
    message: null,
    status,
    created_at: '2026-11-10T00:00:00Z',
    decided_at: null,
    trip: tripSummary,
    ...overrides,
  };
}

function myTrips(overrides: Partial<MyTrips> = {}): MyTrips {
  return {
    published: [],
    applied: [],
    matched: [],
    completed: [],
    pending_application_count: 0,
    ...overrides,
  };
}

describe('groupCounts', () => {
  it('counts every group', () => {
    const data = myTrips({
      published: [trip(1), trip(2)],
      applied: [application('pending', trip(3)), application('accepted', trip(4))],
      matched: [trip(3), trip(4)],
      completed: [trip(5), trip(6)],
    });

    expect(groupCounts(data)).toEqual({ published: 2, applied: 2, matched: 2, completed: 2 });
  });

  it('counts a repeated application as one trip', () => {
    const data = myTrips({
      applied: [application('left', trip(3)), application('pending', trip(3))],
    });

    expect(groupCounts(data).applied).toBe(1);
  });

  it('returns zeros for empty groups', () => {
    expect(groupCounts(myTrips())).toEqual({
      published: 0,
      applied: 0,
      matched: 0,
      completed: 0,
    });
  });
});

describe('groupApplied', () => {
  it('collapses repeated applications of the same trip and keeps the newest first', () => {
    const newest = application('pending', trip(3), {
      id: 7,
      created_at: '2026-11-12T00:00:00Z',
    });
    const older = application('left', trip(3), {
      id: 4,
      created_at: '2026-11-05T00:00:00Z',
    });
    const other = application('rejected', trip(4), {
      id: 2,
      created_at: '2026-11-01T00:00:00Z',
    });

    const groups = groupApplied([newest, older, other]);

    expect(groups.map((group) => group.trip_id)).toEqual([3, 4]);
    expect(groups[0].latest).toBe(newest);
    expect(groups[0].history).toEqual([newest, older]);
    expect(groups[0].counts).toEqual({
      total: 2,
      pending: 1,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
      left: 1,
    });
    expect(groups[1].counts.total).toBe(1);
  });
});

describe('applicationCancelCause', () => {
  it('explains cancelled applications closed by the trip lifecycle', () => {
    expect(
      applicationCancelCause(application('cancelled', trip(3), { status_reason: 'TRIP_CANCELLED' })),
    ).toBe('trip_cancelled');
    expect(
      applicationCancelCause(application('cancelled', trip(3), { status_reason: 'TRIP_COMPLETED' })),
    ).toBe('trip_completed');
  });

  it('does not guess when the backend omits the reason code', () => {
    expect(applicationCancelCause(application('cancelled'))).toBeNull();
    expect(
      applicationCancelCause(application('cancelled', trip(3, { status: 'cancelled' }))),
    ).toBeNull();
    expect(
      applicationCancelCause(application('cancelled', trip(3), { status_reason: 'USER_CANCEL' })),
    ).toBeNull();
  });
});

describe('pending application helpers', () => {
  it('picks the first trip that still has pending applications', () => {
    const data = myTrips({
      pending_applications: [
        { trip_id: 3, count: 2 },
        { trip_id: 5, count: 1 },
      ],
      pending_application_count: 3,
    });

    expect(pendingTargetTripId(data)).toBe(3);
    expect(pendingCountFor(data, 3)).toBe(2);
    expect(pendingCountFor(data, 5)).toBe(1);
    expect(pendingCountFor(data, 99)).toBe(0);
  });

  it('tolerates a backend without per-trip counts', () => {
    const data = myTrips({ pending_application_count: 0 });

    expect(pendingTargetTripId(data)).toBeNull();
    expect(pendingCountFor(data, 3)).toBe(0);
  });
});

describe('actionsFor', () => {
  it('offers view and applications for published trips, plus cancel while recruiting or full', () => {
    expect(actionsFor({ group: 'published', trip: trip(1) })).toEqual([
      'view',
      'applications',
      'cancelTrip',
    ]);
    expect(actionsFor({ group: 'published', trip: trip(1, { status: 'full' }) })).toEqual([
      'view',
      'applications',
      'cancelTrip',
    ]);
    expect(actionsFor({ group: 'published', trip: trip(1, { status: 'ongoing' }) })).toEqual([
      'view',
      'applications',
      'complete',
    ]);
    expect(actionsFor({ group: 'published', trip: trip(1, { status: 'cancelled' }) })).toEqual(['view']);
  });

  it('offers cancel only for pending applications', () => {
    expect(actionsFor({ group: 'applied', trip: trip(3), application: application('pending') })).toEqual([
      'view',
      'cancel',
    ]);
    expect(actionsFor({ group: 'applied', trip: trip(3), application: application('rejected') })).toEqual([
      'view',
    ]);
  });

  it('switches chat and share by trip status for accepted applications', () => {
    expect(
      actionsFor({ group: 'applied', trip: trip(3), application: application('accepted') }),
    ).toEqual(['view', 'chat']);
    expect(
      actionsFor({
        group: 'applied',
        trip: trip(3, { status: 'completed' }),
        application: application('accepted', trip(3, { status: 'completed' })),
      }),
    ).toEqual(['view', 'share']);
  });

  it('offers chat, view and leave for matched trips', () => {
    expect(actionsFor({ group: 'matched', trip: trip(4) })).toEqual(['chat', 'view', 'leave']);
    expect(actionsFor({ group: 'matched', trip: trip(4, { status: 'cancelled' }) })).toEqual([
      'chat',
      'view',
    ]);
  });

  it('offers share and view for completed trips', () => {
    expect(actionsFor({ group: 'completed', trip: trip(5, { status: 'completed' }) })).toEqual([
      'share',
      'view',
    ]);
  });
});

describe('date labels', () => {
  it('formats a range inside the same month', () => {
    expect(formatDateRange('2026-11-20', '2026-11-22')).toBe('11月20日 → 11月22日');
  });

  it('formats a range across months', () => {
    expect(formatDateRange('2026-11-30', '2026-12-02')).toBe('11月30日 → 12月2日');
  });

  it('falls back for malformed dates', () => {
    expect(formatDateRange('', '2026-12-02')).toBe('');
    expect(dayLabel('')).toBe('日期待定');
  });

  it('labels the weekday of the start date', () => {
    expect(dayLabel('2026-11-20')).toBe('周五出发');
  });
});