/**
 * 路线覆盖层：高亮真实高德路线、绘制起点/终点/编号途经点，并与列表联动。
 *
 * 该组件不渲染 DOM，只把 RouteMe 的 RoutePlan/RouteWaypoint 数据翻译成
 * 高德 Polyline/Marker；业务状态仍由页面持有。
 */

import { useEffect, useRef } from 'react';
import type { AmapMap, AmapMarker, AmapPolyline, LngLat } from './types';
import type { RoutePlan, RouteWaypoint } from './AmapService';

const ROUTE_COLOR = '#6C5CE7';
const ROUTE_CASING = '#FFFFFF';

type Props = {
  map: AmapMap | null;
  waypoints: RouteWaypoint[];
  route: RoutePlan | null;
  focusId: string | null;
  onFocus?: (id: string) => void;
};

function markerContent(index: number, total: number, active: boolean): string {
  const isStart = index === 0;
  const isEnd = index === total - 1;
  const tag = isStart ? '起' : isEnd ? '终' : '';
  return [
    `<div class="amap-stop-pin${isStart ? ' is-start' : ''}${isEnd ? ' is-end' : ''}${
      active ? ' is-active' : ''
    }">`,
    `<span class="amap-stop-number">${index + 1}</span>`,
    tag === '' ? '' : `<span class="amap-stop-tag">${tag}</span>`,
    '</div>',
  ].join('');
}

export function RouteLayer({ map, waypoints, route, focusId, onFocus }: Props) {
  const polylinesRef = useRef<AmapPolyline[]>([]);
  const markersRef = useRef<AmapMarker[]>([]);
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  // 路线折线：路线变化时重绘并自动适配范围。
  useEffect(() => {
    const AMap = window.AMap;
    if (map === null || AMap === undefined) {
      return;
    }
    for (const polyline of polylinesRef.current) {
      polyline.setMap(null);
    }
    polylinesRef.current = [];

    if (route === null || route.path.length < 2) {
      return;
    }

    const casing = new AMap.Polyline({
      path: route.path,
      strokeColor: ROUTE_CASING,
      strokeWeight: 10,
      strokeOpacity: 1,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 30,
    });
    const line = new AMap.Polyline({
      path: route.path,
      strokeColor: ROUTE_COLOR,
      strokeWeight: 6,
      strokeOpacity: 0.95,
      lineJoin: 'round',
      lineCap: 'round',
      showDir: false,
      zIndex: 31,
    });
    map.add([casing, line]);
    polylinesRef.current = [casing, line];
    map.setFitView([line], false, [80, 80, 80, 80], 16);
  }, [map, route]);

  // 编号 Marker：途经点、顺序或聚焦项变化时重绘。
  useEffect(() => {
    const AMap = window.AMap;
    if (map === null || AMap === undefined) {
      return;
    }
    for (const marker of markersRef.current) {
      marker.setMap(null);
    }
    markersRef.current = [];

    const markers = waypoints.map((waypoint, index) => {
      const marker = new AMap.Marker({
        position: [waypoint.lng, waypoint.lat] as LngLat,
        content: markerContent(index, waypoints.length, focusId === waypoint.id),
        offset: new AMap.Pixel(-18, -18),
        title: waypoint.name,
        zIndex: focusId === waypoint.id ? 130 : 120,
      });
      marker.on('click', () => onFocusRef.current?.(waypoint.id));
      return marker;
    });
    if (markers.length > 0) {
      map.add(markers);
      markersRef.current = markers;
      if (route === null) {
        map.setFitView(markers, false, [90, 90, 90, 90], 15);
      }
    }
  }, [map, waypoints, focusId, route]);

  // 聚焦列表项 / Marker 时把地图移到对应点位。
  useEffect(() => {
    if (map === null || focusId === null) {
      return;
    }
    const target = waypoints.find((waypoint) => waypoint.id === focusId);
    if (target !== undefined) {
      map.setZoomAndCenter(Math.max(map.getZoom(), 14), [target.lng, target.lat]);
    }
  }, [map, focusId, waypoints]);

  useEffect(() => {
    return () => {
      for (const polyline of polylinesRef.current) {
        polyline.setMap(null);
      }
      for (const marker of markersRef.current) {
        marker.setMap(null);
      }
      polylinesRef.current = [];
      markersRef.current = [];
    };
  }, []);

  return null;
}