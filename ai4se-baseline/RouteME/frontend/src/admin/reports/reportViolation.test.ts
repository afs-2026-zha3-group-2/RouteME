import { describe, expect, it } from 'vitest';
import {
  OTHER_DEDUCTION_OPTIONS,
  REPORT_VIOLATION_OPTIONS,
  deductionOf,
  previewScore,
  safeScore,
  violationLabel,
} from './reportViolation';

describe('reportViolation', () => {
  it('keeps the 8 violation types aligned with the backend enum', () => {
    expect(REPORT_VIOLATION_OPTIONS.map((option) => [option.value, option.deduction])).toEqual([
      ['HARASSMENT', 10],
      ['FAKE_TRIP', 15],
      ['FRAUD_RISK', 30],
      ['ILLEGAL_CONTENT', 20],
      ['IMPERSONATION', 20],
      ['NO_SHOW_DISRUPTION', 10],
      ['PRIVACY_LEAK', 30],
      ['OTHER', 0],
    ]);
  });

  it('offers the four OTHER deduction tiers', () => {
    expect(OTHER_DEDUCTION_OPTIONS.map((option) => option.value)).toEqual([5, 10, 20, 30]);
  });

  it('resolves deduction by type and requires a tier for OTHER', () => {
    expect(deductionOf('', '')).toBeNull();
    expect(deductionOf('FAKE_TRIP', '')).toBe(15);
    expect(deductionOf('OTHER', '')).toBeNull();
    expect(deductionOf('OTHER', 15)).toBeNull();
    expect(deductionOf('OTHER', 20)).toBe(20);
  });

  it('labels known types and degrades unknown values to an empty string', () => {
    expect(violationLabel('PRIVACY_LEAK')).toBe('泄露他人隐私信息');
    expect(violationLabel(null)).toBe('');
    expect(violationLabel(undefined)).toBe('');
  });

  it('previews the score truncated at zero', () => {
    expect(previewScore(80, 15)).toBe(65);
    expect(previewScore(10, 30)).toBe(0);
  });

  it('clamps scores into 0-100 and defaults missing ones to 80', () => {
    expect(safeScore(undefined)).toBe(80);
    expect(safeScore(null)).toBe(80);
    expect(safeScore(-5)).toBe(0);
    expect(safeScore(120)).toBe(100);
    expect(safeScore(65)).toBe(65);
  });
});
