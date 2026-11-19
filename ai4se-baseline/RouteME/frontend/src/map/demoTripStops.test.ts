import { describe, expect, it } from 'vitest';
import { matchCatalogPlace } from './amap/AmapService';

/**
 * 入口演示行程的完整途经点清单（与 V4 种子 + V38 迁移后的数据一致）。
 *
 * 详情页地图按「行程文案包含地名」到离线地名库取坐标；这里逐站断言都能
 * 匹配到预期地点，避免后续改文案或删地名时出现「有站点点不上地图」。
 */
const DEMO_TRIPS: Array<{
  title: string;
  city: string;
  stops: Array<[stop: string, expected: string]>;
}> = [
  {
    title: '珠海情侣路摄影一日游',
    city: '珠海',
    stops: [
      ['香洲港集合', '香洲港'],
      ['情侣路骑行段', '情侣路'],
      ['海滨泳场日落机位', '海滨泳场'],
      ['野狸岛夜景', '野狸岛'],
    ],
  },
  {
    title: '清远英西峰林两日露营',
    city: '清远',
    stops: [
      ['英德西站集合', '英德西站'],
      ['英西峰林徒步 8km', '英西峰林'],
      ['英西峰林营地扎营', '英西峰林营地'],
      ['峰林日出观景台', '峰林日出观景台'],
      ['英德西站返程', '英德西站'],
    ],
  },
  {
    title: '珠海情侣路日落机位二刷',
    city: '珠海',
    stops: [
      ['香洲港集合', '香洲港'],
      ['情侣北路步行', '情侣北路'],
      ['海滨泳场日落', '海滨泳场'],
      ['湾仔海鲜街晚饭', '湾仔海鲜街'],
    ],
  },
  {
    title: '广州老城骑楼扫街半日',
    city: '广州',
    stops: [
      ['陈家祠地铁站集合', '陈家祠'],
      ['恩宁路骑楼', '永庆坊'],
      ['永庆坊', '永庆坊'],
      ['宝华面店午饭', '宝华面店'],
      ['上下九收尾', '上下九步行街'],
    ],
  },
  {
    title: '深圳大鹏半岛海岸线徒步',
    city: '深圳',
    stops: [
      ['大鹏所城集合', '大鹏所城'],
      ['东西涌穿越 12km', '东西涌'],
      ['天文台观景', '西涌天文台'],
      ['较场尾民宿休整', '较场尾'],
      ['次日杨梅坑骑行', '杨梅坑'],
    ],
  },
  {
    title: '佛山祖庙与岭南天地一日',
    city: '佛山',
    stops: [
      ['祖庙地铁站集合', '佛山祖庙'],
      ['祖庙', '佛山祖庙'],
      ['岭南天地', '岭南天地'],
      ['梁园', '梁园'],
      ['岭南天地甜品店收尾', '岭南天地'],
    ],
  },
  {
    title: '上海武康路咖啡散步',
    city: '上海',
    stops: [
      ['武康大楼集合', '武康大楼'],
      ['武康路梧桐段', '武康路'],
      ['安福路咖啡店', '安福路'],
      ['五原路小店收尾', '五原路'],
    ],
  },
];

describe('demo trip stops resolve in the offline catalog', () => {
  for (const trip of DEMO_TRIPS) {
    describe(`${trip.title}（${trip.city}）`, () => {
      for (const [stop, expected] of trip.stops) {
        it(`「${stop}」定位到「${expected}」`, () => {
          const place = matchCatalogPlace(stop, trip.city);
          expect(place, `${stop} 应能在地图定位`).not.toBeNull();
          expect(place?.name).toBe(expected);
          expect(place?.city).toBe(trip.city);
          expect(place?.lng).toBeGreaterThan(100);
          expect(place?.lng).toBeLessThan(125);
          expect(place?.lat).toBeGreaterThan(18);
          expect(place?.lat).toBeLessThan(42);
        });
      }
    });
  }
});
