import { describe, expect, it } from 'vitest';
import { applyLikeState, canLike } from './experienceLikes';
import type { Experience } from '../types';

function experience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: 1,
    trip: { id: 1 } as Experience['trip'],
    author: { id: 2 } as Experience['author'],
    content: '整条线基本没有爬升。',
    intensity: 'moderate',
    advice: '带一件防风外套。',
    photos: [],
    like_count: 4,
    is_liked: false,
    created_at: '2026-11-08T22:10:00Z',
    updated_at: '2026-11-08T22:10:00Z',
    ...overrides,
  };
}

describe('applyLikeState', () => {
  it('adds one like when the target state is liked', () => {
    const result = applyLikeState(experience(), true);

    expect(result.like_count).toBe(5);
    expect(result.is_liked).toBe(true);
  });

  it('removes one like when the target state is unliked', () => {
    const result = applyLikeState(experience({ like_count: 5, is_liked: true }), false);

    expect(result.like_count).toBe(4);
    expect(result.is_liked).toBe(false);
  });

  it('never goes below zero likes', () => {
    const result = applyLikeState(experience({ like_count: 0, is_liked: true }), false);

    expect(result.like_count).toBe(0);
    expect(result.is_liked).toBe(false);
  });

  it('keeps the same object when the state already matches', () => {
    const liked = experience({ like_count: 5, is_liked: true });
    const unliked = experience();

    expect(applyLikeState(liked, true)).toBe(liked);
    expect(applyLikeState(unliked, false)).toBe(unliked);
  });
});

describe('canLike', () => {
  it('allows a signed-in user to like another author’s experience', () => {
    expect(canLike(experience(), 1, true)).toBe(true);
  });

  it('rejects the author of the experience', () => {
    expect(canLike(experience(), 2, true)).toBe(false);
  });

  it('rejects an anonymous visitor', () => {
    expect(canLike(experience(), 1, false)).toBe(false);
  });
});
