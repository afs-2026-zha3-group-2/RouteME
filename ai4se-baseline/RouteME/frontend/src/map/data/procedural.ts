/**
 * 确定性程序化底图（refine-trip-map R2 / design D16）。
 *
 * 非主 Demo 城市的道路网/河流带/公园块由 seed=cityCode 确定性生成：
 * 同一城市每次渲染完全一致，可单测；广州等手工城市 override 本生成器。
 * 纯函数，无副作用，不依赖网络。
 */

import type { CityLayers, District } from './types';

/** 城市代码 → 32 位整数种子（确定性哈希）。 */
export function seedFromCode(code: string): number {
  let seed = 2166136261;
  for (let i = 0; i < code.length; i += 1) {
    seed ^= code.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

/** mulberry32：小型确定性 PRNG，返回 [0,1) 序列。 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round1 = (value: number): number => Number(value.toFixed(1));

/**
 * 生成轻导航底图： jitter 网格道路（含两条主干道）＋一条斜向河流带
 * ＋3 块公园绿地＋传入的分区名。坐标口径 0..100 viewBox。
 */
export function proceduralLayers(code: string, districts: District[]): CityLayers {
  const random = mulberry32(seedFromCode(code));
  const jitter = (range: number): number => (random() - 0.5) * 2 * range;

  const roads: CityLayers['roads'] = [];
  for (let i = 0; i < 6; i += 1) {
    const x = round1(12 + i * 15 + jitter(4));
    roads.push({ x1: x, y1: round1(6 + jitter(3)), x2: round1(x + jitter(5)), y2: round1(94 + jitter(3)), major: i === 2 });
  }
  for (let i = 0; i < 6; i += 1) {
    const y = round1(12 + i * 15 + jitter(4));
    roads.push({ x1: round1(6 + jitter(3)), y1: y, x2: round1(94 + jitter(3)), y2: round1(y + jitter(5)), major: i === 3 });
  }
  // 一条斜向主干道，让路网不像纯网格。
  roads.push({ x1: round1(8 + jitter(4)), y1: round1(86 + jitter(4)), x2: round1(90 + jitter(4)), y2: round1(16 + jitter(4)), major: true });

  const riverY = round1(30 + random() * 35);
  const bend = round1(8 + random() * 10);
  const water: CityLayers['water'] = [
    {
      path: `M -4 ${riverY} C 22 ${round1(riverY - bend)}, 40 ${round1(riverY + bend)}, 58 ${riverY} C 74 ${round1(riverY - bend / 2)}, 88 ${round1(riverY + bend / 2)}, 104 ${round1(riverY + 4)}`,
      width: round1(3 + random() * 1.5),
    },
  ];

  const parks: CityLayers['parks'] = [];
  for (let i = 0; i < 3; i += 1) {
    parks.push({
      x: round1(10 + random() * 66),
      y: round1(10 + random() * 66),
      w: round1(8 + random() * 7),
      h: round1(6 + random() * 5),
    });
  }

  return { roads, water, parks, districts };
}