/** 成都城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '510100',
  [
    { name: '青羊', x: 36, y: 44 },
    { name: '锦江', x: 52, y: 50 },
    { name: '武侯', x: 44, y: 58 },
    { name: '成华', x: 60, y: 36 },
  ],
  [
    {
      id: 'cd-traveler-rongrong',
      name: '蓉蓉',
      age: 21,
      homeCity: '成都',
      tags: ['美食', '历史', '熊猫'],
      dateRange: ['2026-11-18', '2026-11-19'],
      route: ['成都-宽窄巷子', '成都-锦里', '成都-武侯祠', '成都-春熙路'],
    },
  ],
);