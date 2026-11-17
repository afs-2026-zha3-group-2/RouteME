/** 澳门城市重数据（legacy 同构模块；二级区代码共用本模块）。 */
import { buildCity } from './shared';

export default buildCity(
  '820000',
  [
    { name: '澳门半岛', x: 48, y: 40 },
    { name: '氹仔', x: 56, y: 64 },
  ],
  [
    {
      id: 'mo-traveler-xiaobao',
      name: '小宝',
      age: 22,
      homeCity: '珠海',
      tags: ['美食', '历史', '慢旅行'],
      dateRange: ['2026-11-23', '2026-11-23'],
      route: ['澳门-大三巴牌坊', '澳门-官也街'],
    },
  ],
);