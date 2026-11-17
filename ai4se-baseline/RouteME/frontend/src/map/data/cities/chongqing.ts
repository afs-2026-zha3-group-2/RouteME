/** 重庆城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '500100',
  [
    { name: '渝中', x: 56, y: 48 },
    { name: '江北', x: 58, y: 36 },
    { name: '南岸', x: 64, y: 60 },
    { name: '沙坪坝', x: 30, y: 44 },
  ],
  [
    {
      id: 'cq-traveler-xiaoyu',
      name: '小雨',
      age: 23,
      homeCity: '重庆',
      tags: ['夜景', '美食', '城市漫步'],
      dateRange: ['2026-11-20', '2026-11-21'],
      route: ['重庆-洪崖洞', '重庆-解放碑', '重庆-长江索道'],
    },
  ],
);