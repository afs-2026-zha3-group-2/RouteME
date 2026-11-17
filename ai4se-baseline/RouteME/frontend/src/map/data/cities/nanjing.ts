/** 南京城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '320100',
  [
    { name: '玄武', x: 54, y: 34 },
    { name: '秦淮', x: 50, y: 56 },
    { name: '鼓楼', x: 46, y: 42 },
    { name: '建邺', x: 40, y: 54 },
  ],
  [
    {
      id: 'nj-traveler-jinling',
      name: '金陵客',
      age: 24,
      homeCity: '南京',
      tags: ['历史', '夜景', '美食'],
      dateRange: ['2026-11-18', '2026-11-19'],
      route: ['南京-夫子庙', '南京-玄武湖', '南京-总统府'],
    },
  ],
);