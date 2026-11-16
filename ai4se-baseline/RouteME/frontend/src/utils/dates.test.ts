import { describe, expect, it } from 'vitest';
import { dayjsToIso, isoToDayjs } from './dates';

describe('date bridge', () => {
  it('round-trips an ISO date through Dayjs', () => {
    expect(dayjsToIso(isoToDayjs('2026-12-05'))).toBe('2026-12-05');
  });

  it('maps an empty value to null and back', () => {
    expect(isoToDayjs('')).toBeNull();
    expect(dayjsToIso(null)).toBe('');
  });
});