import { describe, expect, it } from 'vitest';
import { creditLabel, creditLine, creditTone, normalizeCreditLevel, normalizeCreditScore } from './creditDisplay';

describe('creditLabel', () => {
  it('maps the five contract codes to Chinese labels', () => {
    expect(creditLabel('excellent')).toBe('信用优秀');
    expect(creditLabel('good')).toBe('信用良好');
    expect(creditLabel('fair')).toBe('信用一般');
    expect(creditLabel('low')).toBe('信用较低');
    expect(creditLabel('risk')).toBe('信用风险');
  });

  it('falls back to good for an unknown or missing code', () => {
    expect(creditLabel('unknown')).toBe('信用良好');
    expect(creditLabel(null)).toBe('信用良好');
    expect(creditLabel(undefined)).toBe('信用良好');
  });
});

describe('creditTone', () => {
  it('maps every level to its modifier class', () => {
    expect(creditTone('excellent')).toBe('is-excellent');
    expect(creditTone('good')).toBe('is-good');
    expect(creditTone('fair')).toBe('is-fair');
    expect(creditTone('low')).toBe('is-low');
    expect(creditTone('risk')).toBe('is-risk');
  });
});

describe('normalizeCreditScore', () => {
  it('clamps to 0-100 and rounds', () => {
    expect(normalizeCreditScore(120)).toBe(100);
    expect(normalizeCreditScore(-5)).toBe(0);
    expect(normalizeCreditScore(88.6)).toBe(89);
  });

  it('defaults to 80 when the score is missing', () => {
    expect(normalizeCreditScore(undefined)).toBe(80);
    expect(normalizeCreditScore(null)).toBe(80);
    expect(normalizeCreditScore(Number.NaN)).toBe(80);
  });
});

describe('normalizeCreditLevel', () => {
  it('keeps contract codes and normalizes the rest to good', () => {
    expect(normalizeCreditLevel('low')).toBe('low');
    expect(normalizeCreditLevel('')).toBe('good');
  });
});

describe('creditLine', () => {
  it('always shows the score, the 100 cap and the level label', () => {
    expect(creditLine(80, 'good')).toBe('信用分：80 / 100 · 信用良好');
    expect(creditLine(90, 'excellent')).toBe('信用分：90 / 100 · 信用优秀');
  });

  it('clamps the score and falls back on the level', () => {
    expect(creditLine(150, 'unknown')).toBe('信用分：100 / 100 · 信用良好');
  });
});
