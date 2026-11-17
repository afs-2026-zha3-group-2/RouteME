/** 珠海城市重数据（legacy 同构模块；林见夏引用真实行程 1/3 的珠海摄影线）。 */
import { buildCity } from './shared';

export default buildCity(
  '440400',
  [
    { name: '香洲', x: 50, y: 40 },
    { name: '金湾', x: 30, y: 64 },
    { name: '斗门', x: 24, y: 30 },
  ],
  [
    {
      id: 'zh-traveler-jianxia',
      name: '林见夏',
      age: 21,
      homeCity: '珠海',
      userId: 1,
      tripId: 3,
      tags: ['摄影', '海边', '美食'],
      dateRange: ['2026-11-16', '2026-11-16'],
      route: ['珠海-香洲港', '珠海-情侣路', '珠海-珠海渔女', '珠海-日月贝'],
    },
    {
      id: 'zh-traveler-xiaoyu',
      name: '珠海小鱼',
      age: 23,
      homeCity: '珠海',
      tags: ['海边', '骑行', '日落'],
      dateRange: ['2026-11-18', '2026-11-18'],
      route: ['珠海-情侣路', '珠海-珠海渔女', '珠海-香洲港'],
    },
  ],
);