import { describe, expect, it } from 'vitest';
import { moveStop, removeStop, replaceStop, resolvedCount } from './itineraryEdit';
import type { ResolvedStop } from './poiResolve';

const mk = (name: string, order: number, resolved = true): ResolvedStop => ({
  name,
  reason: `${name}理由`,
  arrival: '09:00',
  stay_minutes: 90,
  indoor: false,
  order,
  resolved,
  ...(resolved ? { lng: 113.3 + order / 100, lat: 23.1 + order / 100 } : {}),
});

const four = [mk('广州塔', 1), mk('海心沙', 2), mk('花城广场', 3), mk('北京路步行街', 4)];

describe('removeStop', () => {
  it('removes the stop and renumbers the rest', () => {
    const next = removeStop(four, 1);
    expect(next.map((stop) => stop.name)).toEqual(['广州塔', '花城广场', '北京路步行街']);
    expect(next.map((stop) => stop.order)).toEqual([1, 2, 3]);
  });

  it('ignores out-of-range indexes', () => {
    expect(removeStop(four, 9)).toEqual(four);
    expect(removeStop(four, -1)).toEqual(four);
  });
});

describe('replaceStop', () => {
  it('swaps the stop in place without changing the order', () => {
    const next = replaceStop(four, 3, mk('永庆坊', 99));
    expect(next.map((stop) => stop.name)).toEqual(['广州塔', '海心沙', '花城广场', '永庆坊']);
    expect(next.map((stop) => stop.order)).toEqual([1, 2, 3, 4]);
  });
});

describe('moveStop', () => {
  it('moves a stop up and renumbers', () => {
    const three = [mk('A', 1), mk('B', 2), mk('C', 3)];
    const next = moveStop(three, 2, -1);
    expect(next.map((stop) => stop.name)).toEqual(['A', 'C', 'B']);
    expect(next.map((stop) => stop.order)).toEqual([1, 2, 3]);
  });

  it('moves a stop down and renumbers', () => {
    const three = [mk('A', 1), mk('B', 2), mk('C', 3)];
    const next = moveStop(three, 0, 1);
    expect(next.map((stop) => stop.name)).toEqual(['B', 'A', 'C']);
    expect(next.map((stop) => stop.order)).toEqual([1, 2, 3]);
  });

  it('keeps the first and last stops at the boundaries', () => {
    const three = [mk('A', 1), mk('B', 2), mk('C', 3)];
    expect(moveStop(three, 0, -1).map((stop) => stop.name)).toEqual(['A', 'B', 'C']);
    expect(moveStop(three, 2, 1).map((stop) => stop.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('resolvedCount', () => {
  it('counts only resolved stops', () => {
    expect(resolvedCount(four)).toBe(4);
    expect(resolvedCount([mk('A', 1), mk('神秘景点', 2, false), mk('C', 3)])).toBe(2);
    expect(resolvedCount([mk('神秘景点', 1, false)])).toBe(0);
  });
});