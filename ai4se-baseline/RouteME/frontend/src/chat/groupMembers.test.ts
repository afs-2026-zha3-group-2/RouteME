import { describe, expect, it } from 'vitest';
import { buildGroupMembers } from './groupMembers';
import type { DemoUser } from '../types';

const user = (id: number): DemoUser => ({
  id,
  nickname: `用户${id}`,
  avatar_initial: `用${id}`,
  bio: '',
  interests: [],
  profile_complete: true,
  student_verified: true,
});

describe('buildGroupMembers', () => {
  it('puts the publisher first and marks companions', () => {
    const members = buildGroupMembers(user(1), [user(2), user(3)]);
    expect(members.map((member) => member.user.id)).toEqual([1, 2, 3]);
    expect(members.map((member) => member.role)).toEqual([
      'publisher',
      'companion',
      'companion',
    ]);
  });

  it('deduplicates by id, including the publisher appearing in participants', () => {
    const members = buildGroupMembers(user(1), [user(2), user(1), user(2)]);
    expect(members.map((member) => member.user.id)).toEqual([1, 2]);
  });

  it('keeps a publisher-only group when nobody else is accepted', () => {
    const members = buildGroupMembers(user(7), []);
    expect(members).toEqual([{ user: user(7), role: 'publisher' }]);
  });

  it('does not mutate the participants array', () => {
    const participants = [user(3), user(2)];
    buildGroupMembers(user(1), participants);
    expect(participants.map((participant) => participant.id)).toEqual([3, 2]);
  });
});