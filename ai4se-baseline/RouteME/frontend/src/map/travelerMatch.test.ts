import { describe, expect, it } from 'vitest';
import { matchTravelers, overlapPercent, sharedPois, topMatch } from './travelerMatch';
import type { Traveler } from './data/types';

const traveler = (id: string, route: string[]): Traveler => ({
  id,
  name: id,
  age: 22,
  homeCity: '广州',
  tags: ['摄影'],
  dateRange: ['2026-11-18', '2026-11-18'],
  route,
});

describe('travelerMatch（U6）', () => {
  const route = ['广州-广州塔', '广州-海心沙', '广州-花城广场', '广州-北京路'];

  it('computes overlap as shared / route length (3/4 = 75)', () => {
    expect(overlapPercent(route, ['广州-广州塔', '广州-海心沙', '广州-花城广场', '广州-广东省博物馆'])).toBe(75);
    expect(overlapPercent(route, route)).toBe(100);
    expect(overlapPercent(route, ['珠海-情侣路'])).toBe(0);
  });

  it('returns 0 for an empty route without dividing by zero', () => {
    expect(overlapPercent([], ['广州-广州塔'])).toBe(0);
    expect(matchTravelers([], [traveler('a', route)])).toEqual([]);
  });

  it('lists shared POIs in route order without duplicates', () => {
    expect(sharedPois(route, ['广州-北京路', '广州-广州塔', '广州-北京路'])).toEqual([
      '广州-广州塔',
      '广州-北京路',
    ]);
  });

  it('filters zero-overlap travelers and sorts descending', () => {
    const matches = matchTravelers(route, [
      traveler('low', ['广州-北京路']),
      traveler('none', ['珠海-情侣路']),
      traveler('high', ['广州-广州塔', '广州-海心沙', '广州-花城广场']),
    ]);
    expect(matches.map((match) => match.traveler.id)).toEqual(['high', 'low']);
    expect(matches.map((match) => match.percent)).toEqual([75, 25]);
  });

  it('aggregates the top percent and count for the bubble', () => {
    const matches = matchTravelers(route, [
      traveler('a', ['广州-广州塔', '广州-海心沙', '广州-北京路']),
      traveler('b', ['广州-北京路']),
    ]);
    expect(topMatch(matches)).toEqual({ percent: 75, count: 2 });
    expect(topMatch([])).toBeNull();
  });
});