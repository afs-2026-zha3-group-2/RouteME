import { describe, expect, it } from 'vitest';
import { expProgress, isMaxLevel, levelLabel } from './growth';

describe('levelLabel', () => {
  it('renders only LVn and never LV6', () => {
    expect(levelLabel(1)).toBe('LV1');
    expect(levelLabel(3)).toBe('LV3');
    expect(levelLabel(5)).toBe('LV5');
    expect(levelLabel(6)).toBe('LV5');
  });

  it('falls back to LV1 for missing or invalid levels', () => {
    expect(levelLabel(null)).toBe('LV1');
    expect(levelLabel(undefined)).toBe('LV1');
    expect(levelLabel(Number.NaN)).toBe('LV1');
    expect(levelLabel(0)).toBe('LV1');
  });
});

describe('isMaxLevel', () => {
  it('treats LV5 or the server max flag as maxed', () => {
    expect(isMaxLevel(5)).toBe(true);
    expect(isMaxLevel(4, true)).toBe(true);
    expect(isMaxLevel(4, false)).toBe(false);
    expect(isMaxLevel(null)).toBe(false);
  });
});

describe('expProgress', () => {
  it('shows current exp, cap and daily positive budget', () => {
    expect(
      expProgress({
        level: 3,
        exp: 240,
        exp_to_next: 60,
        max_level: false,
        daily_exp: 12,
        daily_limit: 20,
      }),
    ).toEqual({
      percent: 80,
      counter: '240 / 300 EXP',
      hint: '今日经验 12 / 20',
    });
  });

  it('falls back to 0 / 20 when daily budget fields are missing', () => {
    expect(expProgress({ level: 1, exp: 0, exp_to_next: 100 })?.hint).toBe('今日经验 0 / 20');
  });

  it('shows 400+ and max level for LV5', () => {
    expect(expProgress({ level: 5, exp: 520, exp_to_next: null, max_level: true })).toEqual({
      percent: 100,
      counter: '400+ · 已满级',
      hint: '已满级，经验继续累计',
    });
  });

  it('returns null when the response hides exp (other viewers)', () => {
    expect(expProgress({ level: 3 })).toBeNull();
    expect(expProgress(null)).toBeNull();
    expect(expProgress(undefined)).toBeNull();
  });

  it('clamps percent at both ends', () => {
    expect(expProgress({ level: 1, exp: 0, exp_to_next: 100 })?.percent).toBe(0);
    expect(expProgress({ level: 1, exp: 250, exp_to_next: 50 })?.percent).toBe(83);
  });
});
