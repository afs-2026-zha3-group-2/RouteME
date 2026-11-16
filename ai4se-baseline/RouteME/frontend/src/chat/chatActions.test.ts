import { describe, expect, it } from 'vitest';
import type { DemoUser } from '../types';
import { canLeaveTrip } from './chatActions';

const user = (id: number): DemoUser => ({
  id,
  nickname: `用户${id}`,
  avatar_initial: '用',
  school: null,
  bio: '',
  interests: [],
  profile_complete: true,
  avatar_url: null,
  city: null,
  major: null,
  job: null,
});

describe('canLeaveTrip', () => {
  it('hides the action for the publisher', () => {
    expect(
      canLeaveTrip({
        currentUserId: 3,
        isPublisher: true,
        tripStatus: 'recruiting',
        participants: [user(3), user(1)],
      }),
    ).toBe(false);
  });

  it('shows the action for an accepted companion on an open trip', () => {
    expect(
      canLeaveTrip({
        currentUserId: 1,
        isPublisher: false,
        tripStatus: 'full',
        participants: [user(3), user(1)],
      }),
    ).toBe(true);
  });

  it('hides the action when the trip has completed', () => {
    expect(
      canLeaveTrip({
        currentUserId: 1,
        isPublisher: false,
        tripStatus: 'completed',
        participants: [user(3), user(1)],
      }),
    ).toBe(false);
  });

  it('hides the action for a companion who already left', () => {
    expect(
      canLeaveTrip({
        currentUserId: 1,
        isPublisher: false,
        tripStatus: 'recruiting',
        participants: [user(3)],
      }),
    ).toBe(false);
  });
});
