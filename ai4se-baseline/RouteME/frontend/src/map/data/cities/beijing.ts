/** 北京城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '110100',
  [
    { name: '东城', x: 54, y: 46 },
    { name: '西城', x: 44, y: 46 },
    { name: '海淀', x: 28, y: 26 },
    { name: '朝阳', x: 66, y: 36 },
  ],
  [
    {
      id: 'bj-traveler-jingjing',
      name: '京京',
      age: 23,
      homeCity: '北京',
      tags: ['历史', '胡同', '展览'],
      dateRange: ['2026-11-18', '2026-11-20'],
      route: ['北京-故宫', '北京-南锣鼓巷', '北京-什刹海'],
    },
    {
      id: 'bj-traveler-yuanming',
      name: '远明',
      age: 26,
      homeCity: '天津',
      tags: ['园林', '摄影'],
      dateRange: ['2026-11-21', '2026-11-22'],
      route: ['北京-颐和园', '北京-奥林匹克公园', '北京-故宫'],
    },
  ],
);