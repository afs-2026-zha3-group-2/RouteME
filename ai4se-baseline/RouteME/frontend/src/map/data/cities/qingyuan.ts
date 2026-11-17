/** 清远城市重数据（legacy 同构模块；陈屿引用真实行程 2）。 */
import { buildCity } from './shared';

export default buildCity(
  '441800',
  [
    { name: '清城', x: 52, y: 56 },
    { name: '英德', x: 40, y: 30 },
    { name: '连州', x: 26, y: 18 },
  ],
  [
    {
      id: 'qy-traveler-chenyu',
      name: '陈屿',
      age: 24,
      homeCity: '广州',
      userId: 2,
      tripId: 2,
      tags: ['露营', '自然', '徒步'],
      dateRange: ['2026-11-21', '2026-11-22'],
      route: ['清远-古龙峡', '清远-连州地下河'],
    },
  ],
);