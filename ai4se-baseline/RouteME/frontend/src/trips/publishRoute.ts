/**
 * 发布页路线段的提交投影：编辑器持坐标，表单只收地名。
 *
 * <p>已定位点按当前顺序在前；解析失败但可读的名称按原相对顺序追加在后，
 * 不伪造坐标也不静默删除（说明文案由编辑器展示）。
 */

import type { RouteWaypoint } from '../map/amap/AmapService';

export function projectStops(
  located: readonly RouteWaypoint[],
  unlocated: readonly string[],
): string[] {
  const names = [
    ...located.map((waypoint) => waypoint.name),
    ...unlocated,
  ]
    .map((name) => name.trim())
    .filter((name) => name !== '');
  return names;
}