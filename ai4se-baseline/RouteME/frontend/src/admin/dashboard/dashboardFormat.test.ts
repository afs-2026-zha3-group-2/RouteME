import { describe, expect, it } from 'vitest';
import {
  donutSegments,
  formatCount,
  percentOf,
  stackSegments,
  windowRatio,
} from './dashboardFormat';

describe('percentOf', () => {
  it('returns 0 for an empty total instead of NaN', () => {
    expect(percentOf(1, 0)).toBe(0);
    expect(percentOf(0, 0)).toBe(0);
  });

  it('rounds to whole percentages', () => {
    expect(percentOf(0, 5)).toBe(0);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(5, 5)).toBe(100);
  });
});

describe('stackSegments', () => {
  it('keeps the fixed key order and drops zero-width segments', () => {
    const segments = stackSegments(
      { recruiting: 2, full: 0, ongoing: 1, completed: 0, cancelled: 1 },
      ['recruiting', 'full', 'ongoing', 'completed', 'cancelled'],
      {
        recruiting: '招募中',
        full: '已满员',
        ongoing: '旅行中',
        completed: '已结束',
        cancelled: '已取消',
      },
    );

    expect(segments).toEqual([
      { key: 'recruiting', label: '招募中', value: 2, percent: 50 },
      { key: 'ongoing', label: '旅行中', value: 1, percent: 25 },
      { key: 'cancelled', label: '已取消', value: 1, percent: 25 },
    ]);
  });

  it('returns no segments for an all-zero distribution', () => {
    expect(stackSegments({ a: 0, b: 0 }, ['a', 'b'], { a: 'A', b: 'B' })).toEqual([]);
  });

  it('ignores keys outside the fixed order', () => {
    expect(stackSegments({ a: 1, unexpected: 9 }, ['a'], { a: 'A' })).toEqual([
      { key: 'a', label: 'A', value: 1, percent: 100 },
    ]);
  });
});

describe('donutSegments', () => {
  it('accumulates offsets in the fixed order', () => {
    const segments = donutSegments(
      { PENDING: 1, PROCESSING: 0, RESOLVED: 1, REJECTED: 2 },
      ['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'],
    );

    expect(segments).toEqual([
      { key: 'PENDING', value: 1, percent: 25, offset: 0 },
      { key: 'PROCESSING', value: 0, percent: 0, offset: 25 },
      { key: 'RESOLVED', value: 1, percent: 25, offset: 25 },
      { key: 'REJECTED', value: 2, percent: 50, offset: 50 },
    ]);
    expect(segments.at(-1)!.offset + segments.at(-1)!.percent).toBe(100);
  });

  it('returns zero offsets when the total is zero', () => {
    expect(donutSegments({ WAITING: 0, HANDLING: 0, CLOSED: 0 }, ['WAITING', 'HANDLING', 'CLOSED']))
      .toEqual([
        { key: 'WAITING', value: 0, percent: 0, offset: 0 },
        { key: 'HANDLING', value: 0, percent: 0, offset: 0 },
        { key: 'CLOSED', value: 0, percent: 0, offset: 0 },
      ]);
  });
});

describe('windowRatio', () => {
  it('returns 0 for empty input', () => {
    expect(windowRatio(0, 7)).toBe(0);
    expect(windowRatio(3, 0)).toBe(0);
  });

  it('scales by the window length and caps at 100 percent', () => {
    expect(windowRatio(7, 7)).toBe(100);
    expect(windowRatio(14, 7)).toBe(100);
    expect(windowRatio(3, 7)).toBe(43);
    expect(windowRatio(1, 30)).toBe(3);
  });
});

describe('formatCount', () => {
  it('renders zero as 0', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('adds thousands separators', () => {
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(1234567)).toBe('1,234,567');
  });
});