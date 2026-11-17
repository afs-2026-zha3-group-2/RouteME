/** 杭州城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '330100',
  [
    { name: '上城', x: 50, y: 52 },
    { name: '西湖', x: 32, y: 44 },
    { name: '拱墅', x: 50, y: 34 },
    { name: '滨江', x: 52, y: 66 },
  ],
  [
    {
      id: 'hz-traveler-xizi',
      name: '西子',
      age: 22,
      homeCity: '杭州',
      tags: ['自然', '摄影', '茶文化'],
      dateRange: ['2026-11-17', '2026-11-18'],
      route: ['杭州-西湖', '杭州-雷峰塔', '杭州-河坊街'],
    },
  ],
);