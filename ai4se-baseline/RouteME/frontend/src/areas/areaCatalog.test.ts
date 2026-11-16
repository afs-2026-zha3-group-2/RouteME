import { describe, expect, it } from 'vitest';
import { cityByCode, codesForCityName, mapCityForCode } from './areaCatalog';

describe('area catalog', () => {
  it('maps a city code back to its province and city', () => {
    expect(cityByCode('440400')?.name).toBe('珠海');
    expect(cityByCode('999999')).toBeUndefined();
  });

  it('restores the cascader path from a destination name', () => {
    expect(codesForCityName('珠海')).toEqual(['440000', '440400']);
    expect(codesForCityName('九龙')).toEqual(['810000', '810200']);
    expect(codesForCityName('火星')).toBeUndefined();
  });

  it('scopes the map to the gazetteer city for Hong Kong and Macau sub-areas', () => {
    expect(mapCityForCode('440400')).toBe('珠海');
    expect(mapCityForCode('810200')).toBe('香港');
    expect(mapCityForCode('820100')).toBe('澳门');
    expect(mapCityForCode('')).toBeUndefined();
  });
});