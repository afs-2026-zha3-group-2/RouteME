import { describe, expect, it } from 'vitest';
import type { DemoUser } from '../types';
import { tripCompanions } from './companions';

function member(id: number, nickname: string): DemoUser {
  return {
    id,
    nickname,
    avatar_initial: nickname.slice(0, 1),
    bio: '',
    interests: [],
    profile_complete: true,
    student_verified: true,
  };
}

describe('tripCompanions', () => {
  it('drops the publisher from the participant list', () => {
    const participants = [member(2, '陈屿'), member(1, '林见夏'), member(4, '周野')];

    const companions = tripCompanions(participants, 2);

    expect(companions.map((item) => item.id)).toEqual([1, 4]);
  });

  it('keeps the first occurrence when the same member is returned twice', () => {
    const participants = [member(2, '陈屿'), member(1, '林见夏'), member(1, '林见夏')];

    const companions = tripCompanions(participants, 2);

    expect(companions).toHaveLength(1);
    expect(companions[0].nickname).toBe('林见夏');
  });

  it('preserves the response order instead of sorting by name or id', () => {
    const participants = [member(2, '陈屿'), member(4, '周野'), member(1, '林见夏'), member(3, '苏念')];

    const companions = tripCompanions(participants, 2);

    expect(companions.map((item) => item.nickname)).toEqual(['周野', '林见夏', '苏念']);
  });

  it('returns an empty list when only the publisher joined', () => {
    expect(tripCompanions([member(2, '陈屿')], 2)).toEqual([]);
  });

  it('returns an empty list for an empty response', () => {
    expect(tripCompanions([], 2)).toEqual([]);
  });

  it('does not mutate the incoming participant list', () => {
    const participants = [member(2, '陈屿'), member(1, '林见夏')];

    tripCompanions(participants, 2);

    expect(participants.map((item) => item.id)).toEqual([2, 1]);
  });
});
