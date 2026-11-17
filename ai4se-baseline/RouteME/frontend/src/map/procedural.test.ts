import { describe, expect, it } from 'vitest';
import { mulberry32, proceduralLayers, seedFromCode } from './data/procedural';

describe('procedural layers（确定性底图）', () => {
  it('is deterministic for the same city code', () => {
    const districts = [{ name: '测试区', x: 50, y: 50 }];
    const first = proceduralLayers('440400', districts);
    const second = proceduralLayers('440400', districts);
    expect(first).toEqual(second);
  });

  it('differs across city codes', () => {
    const districts = [{ name: '测试区', x: 50, y: 50 }];
    const zhuhai = proceduralLayers('440400', districts);
    const foshan = proceduralLayers('440600', districts);
    expect(zhuhai.roads).not.toEqual(foshan.roads);
  });

  it('produces a light-navigation basemap (roads / water / parks)', () => {
    const layers = proceduralLayers('110100', [{ name: '东城', x: 54, y: 46 }]);
    expect(layers.roads.length).toBe(13); // 6 纵 + 6 横 + 1 斜向主干
    expect(layers.roads.some((road) => road.major)).toBe(true);
    expect(layers.water.length).toBe(1);
    expect(layers.water[0].path.startsWith('M')).toBe(true);
    expect(layers.parks.length).toBe(3);
    for (const park of layers.parks) {
      expect(park.x).toBeGreaterThanOrEqual(0);
      expect(park.x + park.w).toBeLessThanOrEqual(100);
    }
  });

  it('mulberry32 stays in [0,1) and reseeds identically', () => {
    const seed = seedFromCode('440100');
    const a = mulberry32(seed);
    const b = mulberry32(seed);
    for (let i = 0; i < 20; i += 1) {
      const value = a();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(value).toBe(b());
    }
  });
});