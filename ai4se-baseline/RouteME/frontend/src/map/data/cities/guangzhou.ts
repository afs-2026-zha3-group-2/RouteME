/**
 * 广州城市重数据（refine-trip-map R2 主 Demo，design D16）。
 *
 * 手工底图：珠江水系、老城/新城分区、越秀公园与白云山绿地、路网主轴；
 * 完成度为 10 城最高。travelers 引用真实演示用户与行程：
 * - 苏念（userId 3）→ trip 4「广州老城骑楼扫街半日」，邀请跳真实详情申请；
 * - 林见夏（userId 1）无广州行程，邀请给演示提示（不伪造发送成功）。
 * 重合度不在此写死：由 travelerMatch.ts 按共同景点纯函数计算。
 */

import type { CityMapData } from '../types';

const guangzhou: CityMapData = {
  layers: {
    roads: [
      // 纵向路网（含珠江新城主轴）
      { x1: 20, y1: 8, x2: 21, y2: 92 },
      { x1: 34, y1: 6, x2: 33, y2: 94 },
      { x1: 47, y1: 8, x2: 48, y2: 92, major: true },
      { x1: 57, y1: 34, x2: 57, y2: 92, major: true },
      { x1: 68, y1: 10, x2: 69, y2: 90 },
      { x1: 80, y1: 12, x2: 79, y2: 88 },
      // 横向路网
      { x1: 8, y1: 22, x2: 92, y2: 23 },
      { x1: 6, y1: 34, x2: 94, y2: 33 },
      { x1: 8, y1: 46, x2: 92, y2: 47, major: true },
      { x1: 24, y1: 55, x2: 92, y2: 55 },
      { x1: 6, y1: 82, x2: 94, y2: 83 },
      // 老城斜向街巷
      { x1: 24, y1: 40, x2: 40, y2: 60 },
    ],
    water: [
      // 珠江主航道：西向东穿城，海心沙段江心分汊
      {
        path: 'M -4 62 C 16 58, 32 60, 46 62 C 54 63, 58 65, 66 69 C 76 74, 90 76, 104 78',
        width: 4.2,
      },
      { path: 'M 50 61 C 54 60, 58 60, 62 63', width: 1.6 },
    ],
    parks: [
      { x: 38, y: 24, w: 13, h: 11 }, // 越秀公园
      { x: 44, y: 6, w: 18, h: 13 }, // 白云山
      { x: 66, y: 80, w: 15, h: 10 }, // 海珠湿地
      { x: 22, y: 51, w: 6, h: 5 }, // 荔湾湖绿地
    ],
    districts: [
      { name: '荔湾', x: 27, y: 44 },
      { name: '越秀', x: 45, y: 36 },
      { name: '天河', x: 68, y: 48 },
      { name: '海珠', x: 60, y: 76 },
    ],
  },
  travelers: [
    {
      id: 'gz-traveler-jianxia',
      name: '林见夏',
      age: 21,
      homeCity: '珠海',
      userId: 1,
      tags: ['摄影', '海边', '美食'],
      dateRange: ['2026-11-18', '2026-11-18'],
      route: ['广州-广州塔', '广州-海心沙', '广州-花城广场', '广州-广东省博物馆'],
    },
    {
      id: 'gz-traveler-sunian',
      name: '苏念',
      age: 20,
      homeCity: '广州',
      userId: 3,
      tripId: 4,
      tags: ['摄影', '历史', '美食'],
      dateRange: ['2026-11-16', '2026-11-16'],
      route: ['广州-陈家祠', '广州-永庆坊', '广州-沙面岛', '广州-北京路'],
    },
    {
      id: 'gz-traveler-azhe',
      name: '阿哲',
      age: 24,
      homeCity: '佛山',
      tags: ['城市漫步', '夜景', '咖啡'],
      dateRange: ['2026-11-19', '2026-11-20'],
      route: ['广州-广州塔', '广州-海心沙', '广州-北京路', '广州-越秀公园'],
    },
  ],
};

export default guangzhou;