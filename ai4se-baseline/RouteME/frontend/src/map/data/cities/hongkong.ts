/** 香港城市重数据（legacy 同构模块；二级区代码共用本模块）。 */
import { buildCity } from './shared';

export default buildCity(
  '810000',
  [
    { name: '九龙', x: 48, y: 40 },
    { name: '港岛', x: 54, y: 60 },
  ],
  [
    {
      id: 'hk-traveler-weifeng',
      name: '维港小风',
      age: 24,
      homeCity: '深圳',
      tags: ['夜景', '摄影', '城市漫步'],
      dateRange: ['2026-11-22', '2026-11-22'],
      route: ['香港-维多利亚港'],
    },
  ],
);