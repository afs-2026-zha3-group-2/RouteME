import { describe, expect, it } from 'vitest';
import {
  breakdownText,
  emptyRecommendationText,
  formatScore,
  referenceText,
} from './recommendation';

describe('recommendation display', () => {
  it('formats the backend score without recalculating it', () => {
    expect(formatScore(90)).toBe('90 分');
    expect(formatScore(42)).toBe('42 分');
  });

  it('formats breakdown items with backend labels and points', () => {
    expect(
      breakdownText([
        { dimension: 'destination', label: '目的地相同', points: 50 },
        { dimension: 'date', label: '出发日期相同', points: 30 },
        { dimension: 'interest', label: '共同兴趣摄影', points: 10 },
      ]),
    ).toBe('目的地相同 +50 · 出发日期相同 +30 · 共同兴趣摄影 +10');
  });

  it('returns an empty string when there is no breakdown', () => {
    expect(breakdownText([])).toBe('');
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