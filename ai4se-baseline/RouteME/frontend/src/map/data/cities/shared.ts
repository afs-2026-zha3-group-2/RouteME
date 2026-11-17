/**
 * 城市模块共享构建器（refine-trip-map R2 / design D16）。
 * 非手工城市＝程序化底图（seed=cityCode）＋分区名＋该城 travelers。
 * 新增城市只需：index 加 POI 索引＋一个调用本构建器的数据模块＋registry 登记。
 */

import { proceduralLayers } from '../procedural';
import type { CityMapData, District, Traveler } from '../types';

export function buildCity(code: string, districts: District[], travelers: Traveler[] = []): CityMapData {
  return { layers: proceduralLayers(code, districts), travelers };
}