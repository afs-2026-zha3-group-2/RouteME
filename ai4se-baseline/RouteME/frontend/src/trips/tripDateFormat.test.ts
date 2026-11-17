import { describe, expect, it } from 'vitest';
import { formatMonthDay, weekdayLabel } from './tripDateFormat';

describe('tripDateFormat', () => {
  it('formats an ISO date as month and day', () => {
    expect(formatMonthDay('2026-11-06')).toBe('11月6日');
    expect(formatMonthDay('2026-01-31')).toBe('1月31日');
  });

  it('keeps an unparsable value as-is', () => {
    expect(formatMonthDay('待定')).toBe('待定');
  });

  it('maps a date to its weekday', () => {
    expect(weekdayLabel('2026-11-06')).toBe('周五');
    expect(weekdayLabel('2026-11-08')).toBe('周日');
  });

  it('returns an empty weekday for empty or invalid input', () => {
    expect(weekdayLabel('')).toBe('');
    expect(weekdayLabel('not-a-date')).toBe('');
  });
});