import { describe, expect, it } from 'vitest';
import { gazetteerCityForCode } from './gazetteerCity';

describe('gazetteer city mapping', () => {
  it('returns the gazetteer city for a covered destination', () => {
    expect(gazetteerCityForCode('440400')).toBe('珠海');
    expect(gazetteerCityForCode('440100')).toBe('广州');
    // R2 起 MVP 10 城均有索引覆盖。
    expect(gazetteerCityForCode('110100')).toBe('北京');
    expect(gazetteerCityForCode('310100')).toBe('上海');
  });

  it('folds Hong Kong and Macau sub-areas into the gazetteer cities', () => {
    expect(gazetteerCityForCode('810001')).toBe('香港');
    expect(gazetteerCityForCode('820001')).toBe('澳门');
  });

  it('reports no coverage for the rest of the country', () => {
    expect(gazetteerCityForCode('540100')).toBeUndefined(); // 拉萨：fallback 口径
    expect(gazetteerCityForCode('')).toBeUndefined();
    expect(gazetteerCityForCode('999999')).toBeUndefined();
  });
});