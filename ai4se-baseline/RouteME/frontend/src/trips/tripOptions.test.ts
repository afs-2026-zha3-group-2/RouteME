import { describe, expect, it } from 'vitest';
import {
  isTripTravelMode,
  TRIP_TRAVEL_MODES,
  TRIP_TRAVEL_MODE_LABELS,
} from './tripOptions';

describe('isTripTravelMode', () => {
  it('accepts only the three publish travel modes', () => {
    for (const mode of ['driving', 'bicycling', 'transit']) {
      expect(isTripTravelMode(mode), mode).toBe(true);
    }
    for (const value of ['walking', '', ' transit', 'Transit', null, undefined, 1]) {
      expect(isTripTravelMode(value), String(value)).toBe(false);
    }
  });

  it('exposes a label for each publish mode and no walking option', () => {
    expect(TRIP_TRAVEL_MODES.map((mode) => TRIP_TRAVEL_MODE_LABELS[mode])).toEqual([
      '自驾',
      '骑行',
      '公共交通',
    ]);
    expect(TRIP_TRAVEL_MODES).not.toContain('walking');
    expect(Object.values(TRIP_TRAVEL_MODE_LABELS)).not.toContain('步行');
  });
});