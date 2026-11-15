import { describe, expect, it } from 'vitest';
import { greetingForHour } from './greeting';

describe('greetingForHour', () => {
  it('returns the night greeting before six', () => {
    expect(greetingForHour(0)).toBe('夜深了');
    expect(greetingForHour(5)).toBe('夜深了');
  });

  it('returns the morning greeting before eleven', () => {
    expect(greetingForHour(6)).toBe('早上好');
    expect(greetingForHour(10)).toBe('早上好');
  });

  it('returns the noon greeting before fourteen', () => {
    expect(greetingForHour(11)).toBe('中午好');
    expect(greetingForHour(13)).toBe('中午好');
  });

  it('returns the afternoon greeting before eighteen', () => {
    expect(greetingForHour(14)).toBe('下午好');
    expect(greetingForHour(17)).toBe('下午好');
  });

  it('returns the evening greeting at night', () => {
    expect(greetingForHour(18)).toBe('晚上好');
    expect(greetingForHour(23)).toBe('晚上好');
  });

  it('falls back for invalid hours', () => {
    expect(greetingForHour(24)).toBe('你好');
    expect(greetingForHour(-1)).toBe('你好');
    expect(greetingForHour(8.5)).toBe('你好');
  });
});