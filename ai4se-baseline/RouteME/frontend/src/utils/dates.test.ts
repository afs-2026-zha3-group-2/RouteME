import { describe, expect, it } from 'vitest';
import { dayjsToIso, dayjsToLocalDateTime, isoToDayjs, localDateTimeToDayjs } from './dates';

describe('date bridge', () => {
  it('round-trips an ISO date through Dayjs', () => {
    expect(dayjsToIso(isoToDayjs('2026-12-05'))).toBe('2026-12-05');
  });

  it('maps an empty value to null and back', () => {
    expect(isoToDayjs('')).toBeNull();
    expect(dayjsToIso(null)).toBe('');
  });

  it('round-trips a local date-time without shifting the clock', () => {
    expect(dayjsToLocalDateTime(localDateTimeToDayjs('2026-11-20T08:30'))).toBe('2026-11-20T08:30');
    expect(dayjsToLocalDateTime(localDateTimeToDayjs('2026-11-20T23:59'))).toBe('2026-11-20T23:59');
  });

  it('maps an empty date-time to null and back', () => {
    expect(localDateTimeToDayjs('')).toBeNull();
    expect(dayjsToLocalDateTime(null)).toBe('');
  });
});