/**
 * AI 景点名称 → 高德真实坐标：逐个 geocodePlace 解析。
 * 失败标「未定位」，绝不伪造坐标（AC6 / AC7，design §4.2）；不渲染。
 */
import { geocodePlace } from '../map/amap/AmapService';
import type { AiPlanStop } from '../types';

/** 解析后的景点：order 恒为列表顺序号（与地图编号 Marker 一致）。 */
export type ResolvedStop = AiPlanStop & {
  order: number;
  resolved: boolean;
  lng?: number;
  lat?: number;
  /** 高德解析出的城市名，供 transit 换乘搜索限定范围（不进入快照契约）。 */
  city?: string;
};

export async function resolveStops(stops: AiPlanStop[], city?: string): Promise<ResolvedStop[]> {
  const resolved: ResolvedStop[] = [];
  for (const [index, stop] of stops.entries()) {
    const place = await geocodePlace(stop.name, city).catch(() => null);
    resolved.push(
      place === null
        ? { ...stop, order: index + 1, resolved: false }
        : { ...stop, order: index + 1, lng: place.lng, lat: place.lat, city: place.city, resolved: true },
    );
  }
  return resolved;
}