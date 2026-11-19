import { describe, expect, it } from 'vitest';
import { tripMessages } from '../i18n/tripMessages';
import { cleanRouteStops, moveStop, validateRouteStops } from './routeForm';

describe('cleanRouteStops', () => {
  it('trims, drops blanks and dedupes while keeping order', () => {
    expect(cleanRouteStops([' 祖庙地铁站集合 ', '祖庙', '岭南天地', '祖庙', '  ', '梁园']))
      .toEqual(['祖庙地铁站集合', '祖庙', '岭南天地', '梁园']);
  });

  it('returns an empty list for empty input', () => {
    expect(cleanRouteStops([])).toEqual([]);
    expect(cleanRouteStops(['  ', ''])).toEqual([]);
  });
});

describe('validateRouteStops', () => {
  it('accepts two or more cleaned stops', () => {
    expect(validateRouteStops(['祖庙', '岭南天地'])).toBeNull();
    expect(validateRouteStops([' 祖庙 ', '祖庙', '岭南天地'])).toBeNull();
  });

  it('rejects fewer than two stops after cleaning', () => {
    expect(validateRouteStops(['只剩一站'])).toBe(tripMessages.routeStopsMin);
    expect(validateRouteStops(['同一站', '同一站', '  '])).toBe(tripMessages.routeStopsMin);
    expect(validateRouteStops([])).toBe(tripMessages.routeStopsMin);
  });
});

describe('moveStop', () => {
  it('swaps adjacent stops without mutating the original array', () => {
    const stops = ['甲', '乙', '丙'];

    expect(moveStop(stops, 1, -1)).toEqual(['乙', '甲', '丙']);
    expect(moveStop(stops, 1, 1)).toEqual(['甲', '丙', '乙']);
    expect(stops).toEqual(['甲', '乙', '丙']);
  });

  it('returns the same list when the move would go out of bounds', () => {
    const stops = ['甲', '乙'];

    expect(moveStop(stops, 0, -1)).toBe(stops);
    expect(moveStop(stops, 1, 1)).toBe(stops);
    expect(moveStop(stops, -1, 1)).toBe(stops);
    expect(moveStop(stops, 2, -1)).toBe(stops);
  });
});