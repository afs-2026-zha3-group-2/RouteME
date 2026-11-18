import { describe, expect, it } from 'vitest';
import { matchScore } from './matchScore';
import type { DemoUser, TripSummary } from '../types';

const user: DemoUser = {
  id: 1,
  nickname: '陈屿',
  avatar_initial: '陈',
  bio: '',
  interests: ['摄影', '美食'],
  city: '广州',
  profile_complete: true,
  student_verified: true,
};

function tripOf(patch: Partial<TripSummary>): TripSummary {
  return {
    id: 10,
    title: '广州·1日游',
    destination: '广州',
    destination_code: '440100',
    province_code: '440000',
    province_name: '广东省',
    start_date: '2026-11-21',
    end_date: '2026-11-21',
    stops: ['广州塔', '海心沙'],
    meeting_areas: [],
    meeting_time: null,
    travel_mode: null,
    tags: [],
    capacity: 4,
    joined_count: 3,
    status: 'recruiting',
    ending_soon: false,
    publisher: user,
    created_at: '2026-11-18T00:00:00Z',
    ...patch,
  };
}

describe('matchScore', () => {
  it('共同兴趣越多匹配度越高', () => {
    const none = matchScore(tripOf({ tags: [] }), user);
    const one = matchScore(tripOf({ tags: ['摄影'] }), user);
    const two = matchScore(tripOf({ tags: ['摄影', '美食'] }), user);
    expect(one).toBeGreaterThan(none);
    expect(two).toBeGreaterThan(one);
  });

  it('常驻城市与目的地重合时加分', () => {
    const local = matchScore(tripOf({ destination: '广州' }), user);
    const remote = matchScore(tripOf({ destination: '成都' }), user);
    expect(local).toBeGreaterThan(remote);
  });

  it('上限 99，不出现满分', () => {
    const score = matchScore(
      tripOf({ id: 999, tags: ['摄影', '美食', '海边', '徒步', '露营'] }),
      { ...user, interests: ['摄影', '美食', '海边', '徒步', '露营'] },
    );
    expect(score).toBeLessThanOrEqual(99);
  });

  it('同一行程对同一用户结果稳定', () => {
    const trip = tripOf({ tags: ['摄影'] });
    expect(matchScore(trip, user)).toBe(matchScore(trip, user));
  });
});