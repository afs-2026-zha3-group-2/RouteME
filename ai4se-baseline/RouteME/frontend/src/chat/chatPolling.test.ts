import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAT_POLL_INTERVAL_MS, shouldPoll, startChatPolling } from './chatPolling';

describe('chatPolling', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls every three seconds', () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    startChatPolling(reload);

    vi.advanceTimersByTime(CHAT_POLL_INTERVAL_MS);
    expect(reload).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(CHAT_POLL_INTERVAL_MS);
    expect(reload).toHaveBeenCalledTimes(2);
    expect(CHAT_POLL_INTERVAL_MS).toBe(3000);
  });

  it('stops after cleanup', () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    const stop = startChatPolling(reload);

    vi.advanceTimersByTime(CHAT_POLL_INTERVAL_MS);
    stop();
    vi.advanceTimersByTime(CHAT_POLL_INTERVAL_MS * 2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not poll a completed trip', () => {
    expect(shouldPoll('recruiting')).toBe(true);
    expect(shouldPoll('full')).toBe(true);
    expect(shouldPoll('completed')).toBe(false);
    expect(shouldPoll(undefined)).toBe(false);
  });
});
