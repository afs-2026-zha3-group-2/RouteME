import { describe, expect, it } from 'vitest';
import { formatChatTime } from './chatTime';

const now = new Date(2026, 10, 16, 12, 0, 0);

describe('formatChatTime', () => {
  it('shows only the clock for today', () => {
    expect(formatChatTime('2026-11-16T08:05', now)).toBe('今天 08:05');
  });

  it('prefixes yesterday', () => {
    expect(formatChatTime('2026-11-15T23:59', now)).toBe('昨天 23:59');
  });

  it('uses month/day for older values', () => {
    expect(formatChatTime('2026-11-02T09:30', now)).toBe('11/2 09:30');
  });

  it('keeps the raw value when unparsable', () => {
    expect(formatChatTime('不是时间', now)).toBe('不是时间');
  });
});
