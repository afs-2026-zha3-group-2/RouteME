import { tripMessages } from '../i18n/tripMessages';
import { MIN_STOPS } from './tripOptions';

/** 途经点清洗：与后端 cleanStops 同口径，trim 去空、去重保序。 */
export function cleanRouteStops(stops: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const stop of stops) {
    const trimmed = stop.trim();
    if (trimmed !== '' && !seen.has(trimmed)) {
      seen.add(trimmed);
      cleaned.push(trimmed);
    }
  }
  return cleaned;
}

/** 保存前校验：清洗后至少 MIN_STOPS 站，返回错误文案或 null。 */
export function validateRouteStops(stops: string[]): string | null {
  return cleanRouteStops(stops).length < MIN_STOPS ? tripMessages.routeStopsMin : null;
}

/** 相邻交换实现上移 / 下移；越界时原样返回，不改动原数组。 */
export function moveStop(stops: string[], index: number, delta: number): string[] {
  const target = index + delta;
  if (index < 0 || index >= stops.length || target < 0 || target >= stops.length) {
    return stops;
  }
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}