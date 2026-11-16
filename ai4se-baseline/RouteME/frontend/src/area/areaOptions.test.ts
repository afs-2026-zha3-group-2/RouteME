import { describe, expect, it } from 'vitest';
import {
  cascaderValueOf,
  cityLabel,
  destinationLabel,
  findCity,
} from './areaOptions';

describe('areaOptions', () => {
  it('labels a normal city with province / city in summaries', () => {
    expect(destinationLabel('440400')).toBe('广东省 / 珠海市');
    expect(cityLabel('440400')).toBe('珠海市');
    expect(cascaderValueOf('440400')).toEqual(['440000', '440400']);
  });

  it('uses the province name for municipalities', () => {
    expect(destinationLabel('110100')).toBe('北京市');
    expect(cityLabel('110100')).toBe('北京市');
    expect(findCity('110100')?.provinceDisplayName).toBe('北京市');
  });

  it('uses province · district for Hong Kong', () => {
    expect(destinationLabel('810001')).toBe('香港 · 中西區');
    expect(cityLabel('810001')).toBe('香港 · 中西區');
    expect(findCity('810001')?.provinceDisplayName).toBe('香港');
  });

  it('returns empty values for an unknown code', () => {
    expect(findCity('000000')).toBeUndefined();
    expect(destinationLabel('000000')).toBe('');
    expect(cityLabel('000000')).toBe('');
    expect(cascaderValueOf('000000')).toEqual([]);
  });
});
