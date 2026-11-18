import { describe, expect, it } from 'vitest';
import type { RouteWaypoint } from '../map/amap/AmapService';
import { projectStops } from './publishRoute';

function waypoint(name: string, id = name): RouteWaypoint {
  return { id, name, address: '', lng: 113.5767, lat: 22.2859 };
}

describe('projectStops', () => {
  it('keeps the located stop order and appends unresolved names last', () => {
    expect(projectStops([waypoint('香洲港'), waypoint('情侣路')], ['未定位码头'])).toEqual([
      '香洲港',
      '情侣路',
      '未定位码头',
    ]);
  });

  it('drops blank names and keeps duplicate names as separate stops', () => {
    expect(
      projectStops([waypoint('香洲港', 'a'), waypoint('香洲港', 'b'), waypoint('  ', 'c')], [
        '',
        ' 情侣路 ',
      ]),
    ).toEqual(['香洲港', '香洲港', '情侣路']);
  });

  it('returns an empty array when there is nothing to submit', () => {
    expect(projectStops([], [])).toEqual([]);
  });
});