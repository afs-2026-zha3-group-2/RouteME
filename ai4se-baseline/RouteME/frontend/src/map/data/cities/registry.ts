/**
 * 城市重数据懒加载登记处（refine-trip-map R2 / design D16）。
 *
 * loadCity(code) 通过动态 import() 按城加载 Layer/travelers 模块：
 * 中国/省级地图阶段不会加载任何城市重数据；未登记城市返回 null，
 * 由 CityTravelMap 渲染统一 fallback「该城市详细旅行地图正在完善」。
 * 新增城市＝index 加索引＋cities/ 加数据模块＋此处登记一行。
 */

import { cityIndexByCode } from '../index';
import type { CityMapData } from '../types';

type CityLoader = () => Promise<{ default: CityMapData }>;

const LOADERS: Record<string, CityLoader> = {
  // MVP 10 城（广州手工最高完成度）
  '440100': () => import('./guangzhou'),
  '110100': () => import('./beijing'),
  '310100': () => import('./shanghai'),
  '440300': () => import('./shenzhen'),
  '510100': () => import('./chengdu'),
  '500100': () => import('./chongqing'),
  '330100': () => import('./hangzhou'),
  '610100': () => import('./xian'),
  '320100': () => import('./nanjing'),
  '320500': () => import('./suzhou'),
  // legacy 广东城市＋港澳（同构模块，兼容发布/详情/e2e）
  '440400': () => import('./zhuhai'),
  '440600': () => import('./foshan'),
  '441900': () => import('./dongguan'),
  '442000': () => import('./zhongshan'),
  '440700': () => import('./jiangmen'),
  '441200': () => import('./zhaoqing'),
  '441800': () => import('./qingyuan'),
  '441300': () => import('./huizhou'),
  '441700': () => import('./yangjiang'),
  '440800': () => import('./zhanjiang'),
  '440200': () => import('./shaoguan'),
  '440500': () => import('./shantou'),
  '810000': () => import('./hongkong'),
  '820000': () => import('./macau'),
};

/** 该城市是否有离线重数据（港澳台二级区代码归一到港澳）。 */
export function hasCityData(code: string): boolean {
  const canonical = cityIndexByCode(code)?.code;
  return canonical !== undefined && LOADERS[canonical] !== undefined;
}

/** 按城懒加载；未登记→null（fallback 口径，不抛错）。 */
export async function loadCity(code: string): Promise<CityMapData | null> {
  const canonical = cityIndexByCode(code)?.code;
  const loader = canonical === undefined ? undefined : LOADERS[canonical];
  if (loader === undefined) {
    return null;
  }
  const module = await loader();
  return module.default;
}