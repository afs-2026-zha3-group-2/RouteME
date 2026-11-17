/** 上海城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '310100',
  [
    { name: '黄浦', x: 54, y: 48 },
    { name: '静安', x: 46, y: 44 },
    { name: '徐汇', x: 42, y: 58 },
    { name: '浦东', x: 68, y: 50 },
  ],
  [
    {
      id: 'sh-traveler-xiaoman',
      name: '小满',
      age: 22,
      homeCity: '上海',
      tags: ['城市漫步', '咖啡', '夜景'],
      dateRange: ['2026-11-17', '2026-11-18'],
      route: ['上海-外滩', '上海-陆家嘴', '上海-南京路步行街'],
    },
    {
      id: 'sh-traveler-kezhen',
      name: '可桢',
      age: 25,
      homeCity: '苏州',
      tags: ['园林', '历史'],
      dateRange: ['2026-11-22', '2026-11-22'],
      route: ['上海-豫园', '上海-田子坊', '上海-武康路'],
    },
  ],
);