import { describe, expect, it } from 'vitest';
import { COVER_TONES, coverTone } from './coverTone';

describe('coverTone', () => {
  it('keeps the tone stable for the same destination', () => {
    expect(coverTone('440300')).toBe(coverTone('440300'));
    expect(coverTone('110000')).toBe(coverTone('110000'));
  });

  it('always returns one of the five design tokens', () => {
    for (const destination of ['440300', '110000', '310000', '810000', '']) {
      expect(COVER_TONES).toContain(coverTone(destination));
    }
  });

  it('spreads known destinations across different tones', () => {
    const tones = new Set(['440300', '110000', '310000', '440100', '120000'].map(coverTone));
    expect(tones.size).toBeGreaterThan(1);
  });
});