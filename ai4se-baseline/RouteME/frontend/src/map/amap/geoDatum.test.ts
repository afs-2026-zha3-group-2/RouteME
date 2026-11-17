import { describe, expect, it } from 'vitest';
import { outOfChina, wgs84ToGcj02 } from './geoDatum';

describe('WGS-84 → GCJ-02', () => {
  it('shifts a mainland point by a few hundred metres', () => {
    // 珠海淇澳岛附近的 WGS-84 坐标。
    const gcj = wgs84ToGcj02(113.6357, 22.4151);
    const dLng = gcj.lng - 113.6357;
    const dLat = gcj.lat - 22.4151;
    // 境内偏移量级约 0.001–0.01 度（百米级）。
    expect(Math.abs(dLng)).toBeGreaterThan(0.0005);
    expect(Math.abs(dLng)).toBeLessThan(0.01);
    expect(Math.abs(dLat)).toBeGreaterThan(0.0001);
    expect(Math.abs(dLat)).toBeLessThan(0.01);
  });

  it('keeps overseas coordinates untouched', () => {
    expect(outOfChina(139.6917, 35.6895)).toBe(true);
    expect(wgs84ToGcj02(139.6917, 35.6895)).toEqual({ lng: 139.6917, lat: 35.6895 });
  });

  it('returns the input for non-finite values', () => {
    expect(wgs84ToGcj02(Number.NaN, 22)).toEqual({ lng: Number.NaN, lat: 22 });
  });
});