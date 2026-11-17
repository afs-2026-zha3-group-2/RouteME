import { describe, expect, it } from 'vitest';
import { hasCityData, loadCity } from './data/cities/registry';

describe('city registry 懒加载（U8）', () => {
  it('returns null for unregistered cities (fallback 口径)', async () => {
    expect(hasCityData('540100')).toBe(false); // 拉萨
    await expect(loadCity('540100')).resolves.toBeNull();
    await expect(loadCity('999999')).resolves.toBeNull();
  });

  it('loads Guangzhou layers and travelers on demand', async () => {
    expect(hasCityData('440100')).toBe(true);
    const data = await loadCity('440100');
    expect(data).not.toBeNull();
    expect(data!.layers.roads.length).toBeGreaterThan(0);
    expect(data!.layers.water.length).toBeGreaterThan(0);
    expect(data!.layers.parks.length).toBeGreaterThan(0);
    expect(data!.layers.districts.map((district) => district.name)).toEqual(
      expect.arrayContaining(['荔湾', '越秀', '天河', '海珠']),
    );
    expect(data!.travelers.length).toBe(3);
    // 苏念引用真实演示用户与行程 4（邀请跳真实详情申请入口）。
    const sunian = data!.travelers.find((traveler) => traveler.name === '苏念');
    expect(sunian?.userId).toBe(3);
    expect(sunian?.tripId).toBe(4);
  });

  it('normalises HK/Macau secondary codes to the shared module', async () => {
    expect(hasCityData('810001')).toBe(true);
    const hk = await loadCity('810001');
    expect(hk?.travelers[0].route).toContain('香港-维多利亚港');
  });

  it('loads every MVP city module', async () => {
    const codes = ['110100', '310100', '440300', '510100', '500100', '330100', '610100', '320100', '320500'];
    for (const code of codes) {
      const data = await loadCity(code);
      expect(data, code).not.toBeNull();
      expect(data!.layers.roads.length, code).toBeGreaterThan(0);
    }
  });
});