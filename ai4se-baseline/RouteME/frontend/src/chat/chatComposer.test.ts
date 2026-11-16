import { describe, expect, it } from 'vitest';
import { canSendMessage, shouldSendOnEnter } from './chatComposer';

describe('shouldSendOnEnter', () => {
  it('sends on plain Enter', () => {
    expect(shouldSendOnEnter({ key: 'Enter', shiftKey: false })).toBe(true);
  });

  it('keeps a newline for Shift+Enter', () => {
    expect(shouldSendOnEnter({ key: 'Enter', shiftKey: true })).toBe(false);
  });

  it('does not send while the IME is composing', () => {
    expect(shouldSendOnEnter({ key: 'Enter', shiftKey: false, isComposing: true })).toBe(false);
  });

  it('ignores other keys', () => {
    expect(shouldSendOnEnter({ key: 'a', shiftKey: false })).toBe(false);
  });
});

describe('canSendMessage', () => {
  it('rejects blank and trims', () => {
    expect(canSendMessage('   ')).toBe(false);
    expect(canSendMessage(' 你好 ')).toBe(true);
  });

  it('enforces the 500 character contract limit', () => {
    expect(canSendMessage('字'.repeat(500))).toBe(true);
    expect(canSendMessage('字'.repeat(501))).toBe(false);
  });
});
