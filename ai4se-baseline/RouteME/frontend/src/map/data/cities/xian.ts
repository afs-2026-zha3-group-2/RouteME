/** 西安城市重数据（R2 MVP；程序化底图＋Mock 同行者）。 */
import { buildCity } from './shared';

export default buildCity(
  '610100',
  [
    { name: '碑林', x: 52, y: 46 },
    { name: '雁塔', x: 56, y: 60 },
    { name: '莲湖', x: 44, y: 40 },
    { name: '临潼', x: 78, y: 32 },
  ],
  [
    {
      id: 'xa-traveler-changan',
      name: '长安君',
      age: 25,
      homeCity: '西安',
      tags: ['历史', '美食', '博物馆'],
      dateRange: ['2026-11-19', '2026-11-21'],
      route: ['西安-西安城墙', '西安-回民街', '西安-大雁塔', '西安-兵马俑'],
    },
  ],
);