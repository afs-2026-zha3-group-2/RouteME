import { describe, expect, it } from 'vitest';
import { formatJoinedAt, sharedInterests } from './profileFormat';

const viewer = { id: 1, interests: ['摄影', '海边', '美食'] };

describe('sharedInterests', () => {
  it('keeps the viewer order and only common tags', () => {
    expect(sharedInterests(viewer, { id: 2, interests: ['美食', '徒步', '摄影'] })).toEqual(['摄影', '美食']);
  });

  it('returns nothing when there is no overlap', () => {
    expect(sharedInterests(viewer, { id: 2, interests: ['徒步', '露营'] })).toEqual([]);
  });

  it('returns nothing when viewing yourself', () => {
    expect(sharedInterests(viewer, { id: 1, interests: ['摄影', '海边', '美食'] })).toEqual([]);
  });
});

describe('formatJoinedAt', () => {
  it('labels the same day as today', () => {
    expect(formatJoinedAt('2026-11-16T08:00:00Z', new Date('2026-11-16T20:00:00Z'))).toBe('今天');
  });

  it('labels the previous day as yesterday', () => {
    expect(formatJoinedAt('2026-11-15T08:00:00Z', new Date('2026-11-16T09:00:00Z'))).toBe('昨天');
  });

  it('counts days within a month', () => {
    expect(formatJoinedAt('2026-11-04T08:00:00Z', new Date('2026-11-16T09:00:00Z'))).toBe('12 天前');
  });

  it('switches to months after thirty days', () => {
    expect(formatJoinedAt('2026-10-02T08:00:00Z', new Date('2026-11-16T09:00:00Z'))).toBe('1 个月前');
    expect(formatJoinedAt('2026-03-15T09:20:00Z', new Date('2026-11-16T09:00:00Z'))).toBe('8 个月前');
  });

  it('switches to years after twelve months', () => {
    expect(formatJoinedAt('2025-10-13T08:00:00Z', new Date('2026-11-16T09:00:00Z'))).toBe('1 年前');
  });

  it('falls back to the raw value for invalid input', () => {
    expect(formatJoinedAt('not-a-date', new Date('2026-11-16T09:00:00Z'))).toBe('not-a-date');
  });
});
