import type { ProvinceShape } from './types';

/**
 * 中国省级区域离线简化省形（refine-trip-map R2 / design D16）。
 * 低多边形示意口径（非精确行政边界，proposal out-of-scope 已登记）；
 * 坐标为 0..100 viewBox，label 为省名标注锚点。
 */
export const PROVINCE_SHAPES: ProvinceShape[] = [
  { code: '650000', name: '新疆', points: [{ x: 2, y: 18 }, { x: 20, y: 10 }, { x: 32, y: 16 }, { x: 30, y: 30 }, { x: 18, y: 36 }, { x: 4, y: 32 }], label: { x: 17, y: 23 } },
  { code: '540000', name: '西藏', points: [{ x: 4, y: 38 }, { x: 20, y: 36 }, { x: 30, y: 40 }, { x: 28, y: 52 }, { x: 12, y: 54 }, { x: 2, y: 46 }], label: { x: 16, y: 45 } },
  { code: '630000', name: '青海', points: [{ x: 30, y: 30 }, { x: 40, y: 28 }, { x: 44, y: 36 }, { x: 38, y: 42 }, { x: 30, y: 40 }], label: { x: 37, y: 35 } },
  { code: '620000', name: '甘肃', points: [{ x: 32, y: 16 }, { x: 44, y: 20 }, { x: 48, y: 28 }, { x: 44, y: 34 }, { x: 40, y: 28 }, { x: 30, y: 30 }], label: { x: 41, y: 26 } },
  { code: '150000', name: '内蒙古', points: [{ x: 32, y: 10 }, { x: 52, y: 6 }, { x: 66, y: 10 }, { x: 70, y: 18 }, { x: 60, y: 20 }, { x: 48, y: 20 }, { x: 44, y: 16 }], label: { x: 54, y: 13 } },
  { code: '230000', name: '黑龙江', points: [{ x: 70, y: 4 }, { x: 82, y: 2 }, { x: 88, y: 10 }, { x: 82, y: 16 }, { x: 72, y: 14 }], label: { x: 79, y: 9 } },
  { code: '220000', name: '吉林', points: [{ x: 72, y: 14 }, { x: 82, y: 16 }, { x: 84, y: 22 }, { x: 74, y: 22 }], label: { x: 78, y: 18 } },
  { code: '210000', name: '辽宁', points: [{ x: 70, y: 22 }, { x: 80, y: 22 }, { x: 78, y: 30 }, { x: 70, y: 28 }], label: { x: 75, y: 26 } },
  { code: '110000', name: '北京', points: [{ x: 66, y: 26 }, { x: 70, y: 26 }, { x: 70, y: 30 }, { x: 66, y: 30 }], label: { x: 68, y: 28 } },
  { code: '120000', name: '天津', points: [{ x: 70, y: 30 }, { x: 74, y: 30 }, { x: 74, y: 34 }, { x: 70, y: 34 }], label: { x: 72, y: 32 } },
  { code: '130000', name: '河北', points: [{ x: 62, y: 24 }, { x: 66, y: 24 }, { x: 66, y: 30 }, { x: 70, y: 30 }, { x: 70, y: 34 }, { x: 66, y: 38 }, { x: 60, y: 34 }], label: { x: 64, y: 31 } },
  { code: '140000', name: '山西', points: [{ x: 56, y: 26 }, { x: 62, y: 26 }, { x: 60, y: 38 }, { x: 56, y: 38 }], label: { x: 58, y: 32 } },
  { code: '370000', name: '山东', points: [{ x: 66, y: 34 }, { x: 76, y: 32 }, { x: 78, y: 38 }, { x: 68, y: 40 }], label: { x: 72, y: 36 } },
  { code: '410000', name: '河南', points: [{ x: 58, y: 38 }, { x: 68, y: 38 }, { x: 68, y: 46 }, { x: 60, y: 46 }], label: { x: 63, y: 42 } },
  { code: '320000', name: '江苏', points: [{ x: 70, y: 40 }, { x: 78, y: 40 }, { x: 78, y: 46 }, { x: 74, y: 48 }, { x: 72, y: 48 }], label: { x: 75, y: 43 } },
  { code: '310000', name: '上海', points: [{ x: 78, y: 46 }, { x: 82, y: 46 }, { x: 82, y: 50 }, { x: 78, y: 50 }], label: { x: 80, y: 48 } },
  { code: '340000', name: '安徽', points: [{ x: 68, y: 42 }, { x: 74, y: 42 }, { x: 74, y: 52 }, { x: 68, y: 52 }], label: { x: 71, y: 47 } },
  { code: '330000', name: '浙江', points: [{ x: 74, y: 50 }, { x: 82, y: 50 }, { x: 80, y: 58 }, { x: 74, y: 56 }], label: { x: 78, y: 54 } },
  { code: '360000', name: '江西', points: [{ x: 66, y: 52 }, { x: 74, y: 52 }, { x: 72, y: 62 }, { x: 66, y: 60 }], label: { x: 70, y: 57 } },
  { code: '420000', name: '湖北', points: [{ x: 56, y: 46 }, { x: 68, y: 46 }, { x: 66, y: 54 }, { x: 56, y: 52 }], label: { x: 61, y: 50 } },
  { code: '430000', name: '湖南', points: [{ x: 56, y: 54 }, { x: 66, y: 54 }, { x: 64, y: 64 }, { x: 56, y: 62 }], label: { x: 60, y: 59 } },
  { code: '440000', name: '广东', points: [{ x: 62, y: 64 }, { x: 74, y: 62 }, { x: 76, y: 72 }, { x: 66, y: 74 }, { x: 60, y: 70 }], label: { x: 68, y: 68 } },
  { code: '450000', name: '广西', points: [{ x: 50, y: 64 }, { x: 62, y: 64 }, { x: 60, y: 74 }, { x: 50, y: 72 }], label: { x: 55, y: 69 } },
  { code: '460000', name: '海南', points: [{ x: 56, y: 78 }, { x: 62, y: 78 }, { x: 62, y: 84 }, { x: 56, y: 84 }], label: { x: 59, y: 81 } },
  { code: '500000', name: '重庆', points: [{ x: 50, y: 48 }, { x: 56, y: 48 }, { x: 56, y: 56 }, { x: 50, y: 56 }], label: { x: 53, y: 52 } },
  { code: '510000', name: '四川', points: [{ x: 36, y: 42 }, { x: 50, y: 42 }, { x: 50, y: 56 }, { x: 40, y: 58 }, { x: 34, y: 50 }], label: { x: 43, y: 50 } },
  { code: '520000', name: '贵州', points: [{ x: 46, y: 56 }, { x: 56, y: 56 }, { x: 56, y: 64 }, { x: 48, y: 64 }], label: { x: 51, y: 60 } },
  { code: '530000', name: '云南', points: [{ x: 34, y: 58 }, { x: 46, y: 58 }, { x: 48, y: 70 }, { x: 38, y: 72 }, { x: 32, y: 64 }], label: { x: 40, y: 65 } },
  { code: '610000', name: '陕西', points: [{ x: 50, y: 28 }, { x: 56, y: 28 }, { x: 56, y: 46 }, { x: 50, y: 46 }], label: { x: 53, y: 37 } },
  { code: '640000', name: '宁夏', points: [{ x: 46, y: 24 }, { x: 50, y: 24 }, { x: 50, y: 32 }, { x: 46, y: 32 }], label: { x: 48, y: 28 } },
  { code: '350000', name: '福建', points: [{ x: 72, y: 58 }, { x: 80, y: 58 }, { x: 78, y: 68 }, { x: 72, y: 66 }], label: { x: 76, y: 63 } },
  { code: '810000', name: '香港', points: [{ x: 70, y: 74 }, { x: 73, y: 74 }, { x: 73, y: 77 }, { x: 70, y: 77 }], label: { x: 71.5, y: 75.5 } },
  { code: '820000', name: '澳门', points: [{ x: 66, y: 75 }, { x: 68.5, y: 75 }, { x: 68.5, y: 78 }, { x: 66, y: 78 }], label: { x: 67, y: 76.5 } },
  { code: '710000', name: '台湾', points: [{ x: 82, y: 60 }, { x: 86, y: 60 }, { x: 85, y: 70 }, { x: 82, y: 68 }], label: { x: 84, y: 65 } },
];

export function provinceShapePath(shape: ProvinceShape): string {
  return `${shape.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')} Z`;
}

export function findProvinceShape(code: string): ProvinceShape | undefined {
  return PROVINCE_SHAPES.find((shape) => shape.code === code);
}