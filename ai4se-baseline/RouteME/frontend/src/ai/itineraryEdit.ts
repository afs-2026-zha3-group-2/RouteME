/**
 * 行程编辑纯数组操作：删除 / 更换 / 上移 / 下移，order 恒重排 1..n。
 * 不发请求（design §4.2）；路线重算由页面层在变更后触发（AC15）。
 */
import type { ResolvedStop } from './poiResolve';

function renumber(stops: ResolvedStop[]): ResolvedStop[] {
  return stops.map((stop, index) => ({ ...stop, order: index + 1 }));
}

function inRange(stops: ResolvedStop[], index: number): boolean {
  return index >= 0 && index < stops.length;
}

/** 删除指定位置景点并重编号；越界返回原数组。 */
export function removeStop(stops: ResolvedStop[], index: number): ResolvedStop[] {
  if (!inRange(stops, index)) {
    return stops;
  }
  return renumber(stops.filter((_, i) => i !== index));
}

/** 原位替换景点（保留列表位置），order 重编号。 */
export function replaceStop(
  stops: ResolvedStop[],
  index: number,
  replacement: ResolvedStop,
): ResolvedStop[] {
  if (!inRange(stops, index)) {
    return stops;
  }
  const next = [...stops];
  next[index] = replacement;
  return renumber(next);
}

/** 上移 / 下移（delta ±1）；首尾边界不动。 */
export function moveStop(stops: ResolvedStop[], index: number, delta: number): ResolvedStop[] {
  const target = index + delta;
  if (!inRange(stops, index) || !inRange(stops, target)) {
    return stops;
  }
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return renumber(next);
}

/** 已定位景点数：保存门控（resolved ≥ 2）与路线计算子集的依据。 */
export function resolvedCount(stops: ResolvedStop[]): number {
  return stops.filter((stop) => stop.resolved).length;
}