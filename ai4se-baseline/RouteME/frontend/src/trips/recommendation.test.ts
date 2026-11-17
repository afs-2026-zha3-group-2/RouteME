import { describe, expect, it } from 'vitest';
import {
  breakdownLines,
  breakdownText,
  emptyRecommendationText,
  formatScore,
  reasonSentence,
  recommendationReason,
  referenceText,
} from './recommendation';

const destination = { dimension: 'destination' as const, label: '目的地相同', points: 50 };
const sameDate = { dimension: 'date' as const, label: '出发日期相同', points: 30 };
const oneDayApart = { dimension: 'date' as const, label: '旅行日期相差 1 天', points: 20 };
const photoInterest = { dimension: 'interest' as const, label: '共同兴趣摄影', points: 10 };

describe('recommendation display', () => {
  it('formats the backend score as a match percentage without recalculating it', () => {
    expect(formatScore(90)).toBe('匹配度 90%');
    expect(formatScore(42)).toBe('匹配度 42%');
  });

  it('formats breakdown items with backend labels and points', () => {
    expect(breakdownText([destination, sameDate, photoInterest])).toBe(
      '目的地相同 +50 · 出发日期相同 +30 · 共同兴趣摄影 +10',
    );
    expect(breakdownLines([destination, sameDate, photoInterest])).toEqual([
      '目的地相同 +50',
      '出发日期相同 +30',
      '共同兴趣摄影 +10',
    ]);
  });

  it('returns an empty string when there is no breakdown', () => {
    expect(breakdownText([])).toBe('');
    expect(breakdownLines([])).toEqual([]);
  });

  it('builds a readable sentence from the returned destination, date and interests', () => {
    expect(
      reasonSentence({
        breakdown: [destination, sameDate, photoInterest],
        shared_interests: ['摄影'],
      }),
    ).toBe('目的地和日期相同，并且都喜欢摄影');
  });

  it('does not invent an interest reason when there is no shared interest', () => {
    expect(
      reasonSentence({
        breakdown: [destination, sameDate],
        shared_interests: [],
      }),
    ).toBe('目的地和日期相同');
  });

  it('uses the backend wording when the travel dates differ by one day', () => {
    expect(
      reasonSentence({
        breakdown: [destination, oneDayApart, photoInterest],
        shared_interests: ['摄影'],
      }),
    ).toBe('目的地相同，旅行日期相差 1 天，并且都喜欢摄影');
  });

  it('joins multiple shared interests and skips absent dimensions', () => {
    expect(
      reasonSentence({
        breakdown: [photoInterest],
        shared_interests: ['摄影', '美食'],
      }),
    ).toBe('都喜欢摄影和美食');
  });

  it('degrades to backend reasons when breakdown data is missing', () => {
    expect(
      recommendationReason({
        reasons: ['目的地相同 +50'],
        breakdown: [],
        shared_interests: [],
      }),
    ).toBe('目的地相同 +50');
  });

  it('returns no reason instead of fabricating one when all data is missing', () => {
    expect(
      recommendationReason({
        reasons: [],
        breakdown: [],
        shared_interests: [],
      }),
    ).toBe('');
  });

  it('describes the reference trip', () => {
    const text = referenceText({
      trip_id: 4,
      destination: '广州',
      start_date: '2026-11-20',
      interests: ['摄影'],
    });
    expect(text).toContain('广州');
    expect(text).toContain('2026-11-20');
  });

  it('provides explicit empty-state copy', () => {
    const empty = emptyRecommendationText();
    expect(empty.title.length).toBeGreaterThan(0);
    expect(empty.text.length).toBeGreaterThan(0);
  });
});