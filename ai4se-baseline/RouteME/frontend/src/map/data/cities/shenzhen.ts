/** 深圳城市重数据（R2 MVP；legacy POI 索引＋程序化底图；陈屿引用真实行程 5）。 */
import { buildCity } from './shared';

export default buildCity(
  '440300',
  [
    { name: '南山', x: 30, y: 52 },
    { name: '福田', x: 48, y: 48 },
    { name: '罗湖', x: 60, y: 46 },
    { name: '盐田', x: 76, y: 38 },
  ],
  [
    {
      id: 'sz-traveler-chenyu',
      name: '陈屿',
      age: 24,
      homeCity: '广州',
      userId: 2,
      tripId: 5,
      tags: ['徒步', '自然', '露营'],
      dateRange: ['2026-11-23', '2026-11-24'],
      route: ['深圳-梧桐山', '深圳-大梅沙'],
    },
    {
      id: 'sz-traveler-ahai',
      name: '阿海',
      age: 22,
      homeCity: '深圳',
      tags: ['海边', '摄影', '骑行'],
      dateRange: ['2026-11-19', '2026-11-19'],
      route: ['深圳-深圳湾公园', '深圳-世界之窗', '深圳-前海石公园'],
    },
  ],
);