/** 苏州城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '320500',
  [
    { name: '姑苏', x: 50, y: 36 },
    { name: '吴中', x: 44, y: 52 },
    { name: '虎丘', x: 36, y: 28 },
    { name: '园区', x: 74, y: 50 },
  ],
  [
    {
      id: 'szu-traveler-gusu',
      name: '姑苏小慢',
      age: 22,
      homeCity: '苏州',
      tags: ['园林', '摄影', '慢旅行'],
      dateRange: ['2026-11-21', '2026-11-22'],
      route: ['苏州-拙政园', '苏州-平江路', '苏州-山塘街'],
    },
  ],
);