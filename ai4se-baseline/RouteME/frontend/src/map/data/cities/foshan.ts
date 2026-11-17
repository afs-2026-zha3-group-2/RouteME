/** 佛山城市重数据（legacy 同构模块；苏念引用真实行程 6）。 */
import { buildCity } from './shared';

export default buildCity(
  '440600',
  [
    { name: '禅城', x: 52, y: 40 },
    { name: '南海', x: 60, y: 30 },
    { name: '顺德', x: 56, y: 66 },
  ],
  [
    {
      id: 'fs-traveler-sunian',
      name: '苏念',
      age: 20,
      homeCity: '广州',
      userId: 3,
      tripId: 6,
      tags: ['历史', '美食'],
      dateRange: ['2026-11-20', '2026-11-20'],
      route: ['佛山-佛山祖庙', '佛山-岭南天地'],
    },
  ],
);