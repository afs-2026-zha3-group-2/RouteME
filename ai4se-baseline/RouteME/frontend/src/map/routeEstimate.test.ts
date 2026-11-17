import { describe, expect, it } from 'vitest';
import {
  WALK_KM_PER_HOUR,
  estimateRoute,
  formatEstimateKm,
  formatEstimateMinutes,
} from './routeEstimate';

describe('routeEstimate（U7）', () => {
  it('sums straight-line legs with the city kilometre calibration', () => {
    const estimate = estimateRoute(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      0.3,
      0.2,
    );
    // 10*0.3 + 10*0.2 = 5km
    expect(estimate.km).toBeCloseTo(5, 6);
    expect(estimate.minutes).toBeCloseTo((5 / WALK_KM_PER_HOUR) * 60, 6);
  });

  it('returns zero for fewer than two points', () => {
    expect(estimateRoute([], 0.3, 0.2)).toEqual({ km: 0, minutes: 0 });
    expect(estimateRoute([{ x: 5, y: 5 }], 0.3, 0.2)).toEqual({ km: 0, minutes: 0 });
  });

  it('formats distance with the 约/预计 display conventions', () => {
    expect(formatEstimateKm(5.4)).toBe('5');
    expect(formatEstimateKm(0.42)).toBe('0.4');
  });

  it('formats minutes into hours and minutes', () => {
    expect(formatEstimateMinutes(45)).toBe('45 分钟');
    expect(formatEstimateMinutes(60)).toBe('1 小时');
    expect(formatEstimateMinutes(95)).toBe('1 小时 35 分钟');
  });
});