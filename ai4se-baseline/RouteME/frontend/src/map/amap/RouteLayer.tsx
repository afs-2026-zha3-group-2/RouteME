/**
 * 路线覆盖层：绘制路线折线、起点/终点/编号途经点，并与列表联动。
 *
 * 不再依赖高德 Marker/Polyline：地图容器暴露一个与视图同坐标系的覆盖层
 * （`map.overlay`），本组件把像素坐标渲染成 React 节点（portal），
 * 地图平移/缩放时通过 `map.onChange` 重算位置。业务状态仍由页面持有。
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AmapMap, LngLat } from './types';
import type { RoutePlan, RouteWaypoint } from './AmapService';

const ROUTE_COLOR = '#2f9fe0';
const ROUTE_CASING = '#FFFFFF';
const ESTIMATED_DASH = '12 8';

type Props = {
  map: AmapMap | null;
  waypoints: RouteWaypoint[];
  route: RoutePlan | null;
  focusId: string | null;
  onFocus?: (id: string) => void;
  /** 显式编号（列表顺序号）；缺省回退 index+1。未定位 POI 不渲染但保留序号。 */
  numbers?: number[];
};

function toSvgPath(points: LngLat[], map: AmapMap): string {
  return points
    .map((point, index) => {
      const projected = map.project(point);
      return `${index === 0 ? 'M' : 'L'}${projected.x.toFixed(1)} ${projected.y.toFixed(1)}`;
    })
    .join(' ');
}

export function RouteLayer({ map, waypoints, route, focusId, onFocus, numbers }: Props) {
  const [, setVersion] = useState(0);

  // 地图视野变化（拖动 / 缩放 / 容器尺寸）后重算覆盖层坐标。
  useEffect(() => {
    if (map === null) {
      return;
    }
    return map.onChange(() => setVersion((previous) => previous + 1));
  }, [map]);

  // 途经点数组可能每次渲染都新建，用稳定的字符串键判断内容是否变化。
  const waypointKey = waypoints
    .map((waypoint) => `${waypoint.id}:${waypoint.lng},${waypoint.lat}`)
    .join('|');
  const size = map?.getSize();
  const sizeKey = size === undefined ? '' : `${size.width}x${size.height}`;

  // 路线优先适配视野；只有途经点时适配所有点。
  useEffect(() => {
    if (map === null) {
      return;
    }
    if (route !== null && route.path.length >= 2) {
      map.fitBounds(route.path, 80, 16);
      return;
    }
    if (waypoints.length > 0) {
      map.fitBounds(
        waypoints.map((waypoint): LngLat => [waypoint.lng, waypoint.lat]),
        90,
        15,
      );
    }
    // waypointKey / sizeKey 已覆盖数组与容器尺寸的变化。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, route, waypointKey, sizeKey]);

  // 聚焦列表项 / 标记时把地图移到对应点位。
  useEffect(() => {
    if (map === null || focusId === null) {
      return;
    }
    const target = waypoints.find((waypoint) => waypoint.id === focusId);
    if (target !== undefined) {
      map.setZoomAndCenter(Math.max(map.getZoom(), 14), [target.lng, target.lat]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focusId, waypointKey]);

  if (map === null || map.overlay === null) {
    return null;
  }

  const routePath = route !== null && route.path.length >= 2 ? toSvgPath(route.path, map) : null;
  const dash = route?.estimated === true ? ESTIMATED_DASH : undefined;

  return createPortal(
    <>
      {routePath !== null && (
        <svg className="amap-route-svg" aria-hidden="true">
          <path
            d={routePath}
            fill="none"
            stroke={ROUTE_CASING}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dash}
          />
          <path
            d={routePath}
            fill="none"
            stroke={ROUTE_COLOR}
            strokeOpacity={0.95}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dash}
          />
        </svg>
      )}
      {waypoints.map((waypoint, index) => {
        const isStart = index === 0;
        const isEnd = index === waypoints.length - 1;
        const active = focusId === waypoint.id;
        const point = map.project([waypoint.lng, waypoint.lat]);
        const tag = isStart ? '起' : isEnd ? '终' : '';
        // 显式编号（AI 行程列表顺序号）优先；缺省回退 index+1。
        const number = numbers?.[index] ?? index + 1;
        const className = [
          'amap-stop-pin',
          isStart ? 'is-start' : '',
          isEnd ? 'is-end' : '',
          active ? 'is-active' : '',
        ]
          .filter((entry) => entry !== '')
          .join(' ');
        return (
          <button
            key={waypoint.id}
            type="button"
            className="amap-overlay-marker"
            style={{ left: `${point.x}px`, top: `${point.y}px` }}
            title={waypoint.name}
            aria-label={`${number}. ${waypoint.name}`}
            onClick={() => onFocus?.(waypoint.id)}
          >
            <span className={className}>
              <span className="amap-stop-number">{number}</span>
              {tag === '' ? null : <span className="amap-stop-tag">{tag}</span>}
            </span>
          </button>
        );
      })}
    </>,
    map.overlay,
  );
}