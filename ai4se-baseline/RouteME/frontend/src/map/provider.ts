/**
 * 地图数据供应方边界（refine-trip-map R2 / design D21）。
 *
 * 组件只依赖 MapProvider 接口，不感知数据来源。本轮唯一实现是
 * OfflineSvgProvider（本地 SVG 数据，registry 懒加载）；未来接入高德等
 * 在线地图时新增同接口实现即可，ChinaMap/ProvinceMap/CityTravelMap 不改。
 * 本轮不实现任何在线供应方（proposal out-of-scope）。
 */

import { loadCity } from './data/cities/registry';
import type { CityMapData } from './data/types';

export interface MapProvider {
  /** 按城加载重数据；未覆盖城市返回 null（统一 fallback 口径）。 */
  loadCity(code: string): Promise<CityMapData | null>;
}

export const offlineSvgProvider: MapProvider = {
  loadCity,
};