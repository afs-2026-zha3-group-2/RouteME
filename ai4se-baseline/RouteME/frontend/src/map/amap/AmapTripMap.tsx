/**
 * 行程详情只读地图：按途经点名称做高德地理编码，再按行程的出行方式绘制路线
 * （旧行程没有 travel_mode 时回退步行，与既有口径一致）。
 *
 * 与发布/探索页共用 AmapContainer + RouteLayer；不修改行程数据，也不提供
 * 编辑操作。高德服务不可用时依次降级：离线地名库定位 → 直线估算路线，
 * 并把降级结果如实告诉用户。
 */

import { useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import {
  amapErrorMessage,
  geocodePlace,
  planRoute,
  straightLineRoute,
  type RoutePlan,
  type RouteWaypoint,
  type TravelMode,
} from './AmapService';
import { AmapContainer } from './AmapContainer';
import { RouteLayer } from './RouteLayer';
import type { AmapMap, LngLat } from './types';

type Props = {
  city: string;
  stops: string[];
  /** 行程的出行方式；未填写的旧行程按步行处理。 */
  mode?: TravelMode;
  focusStop: string | null;
  onFocusStop?: (name: string) => void;
  /** 解析出的路线（含分段距离/时间）向上冒泡，供详情页连接点时间轴展示。 */
  onRouteChange?: (route: RoutePlan | null) => void;
};

const DEFAULT_CENTER: LngLat = [113.2644, 23.1291];

export function AmapTripMap({
  city,
  stops,
  mode = 'walking',
  focusStop,
  onFocusStop,
  onRouteChange,
}: Props) {
  const [map, setMap] = useState<AmapMap | null>(null);
  const [center, setCenter] = useState<LngLat>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(12);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
  const stopsKey = stops.join('\u0001');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLocationNote(null);
    setEstimateNote(null);
    setWaypoints([]);
    setRoute(null);

    const resolve = async () => {
      const cityPlace = await geocodePlace(city, city).catch(() => null);
      if (!active) {
        return;
      }
      if (cityPlace !== null) {
        setCenter([cityPlace.lng, cityPlace.lat]);
        setZoom(12);
      }

      const resolved: RouteWaypoint[] = [];
      for (const [index, stop] of stops.entries()) {
        const place = await geocodePlace(stop, city).catch(() => null);
        if (place !== null) {
          resolved.push({
            id: `${place.id}-${index}`,
            name: stop,
            address: place.address,
            lng: place.lng,
            lat: place.lat,
          });
        }
      }
      if (!active) {
        return;
      }
      setWaypoints(resolved);
      if (resolved.length < stops.length) {
        setLocationNote(
          resolved.length === 0
            ? '高德服务当前不可用，离线地名库也没有收录这些地点，暂时无法在地图上标出途经点。'
            : `有 ${stops.length - resolved.length} 个途经点未能定位，路线只连接已定位的点。`,
        );
      }

      if (resolved.length >= 2) {
        try {
          const plan = await planRoute(mode, resolved);
          if (active) {
            setRoute(plan);
          }
        } catch (reason: unknown) {
          // 路线服务不可用时仍展示途经点顺序与距离估算，避免整块地图空白。
          if (active) {
            setRoute(straightLineRoute(mode, resolved));
            setEstimateNote(
              `高德路线服务不可用（${amapErrorMessage(reason)}），已按直线显示途经点顺序，距离与时间为本地估算。`,
            );
          }
        }
      }
      if (active) {
        setLoading(false);
      }
    };

    void resolve();
    return () => {
      active = false;
    };
  }, [city, stopsKey, mode]);

  // 路线变化即上报：降级为直线估算时同样上报，父级不会读到过期分段数据。
  useEffect(() => {
    onRouteChange?.(route);
  }, [route, onRouteChange]);

  const focusId =
    focusStop === null
      ? null
      : (waypoints.find((waypoint) => waypoint.name === focusStop)?.id ?? null);

  return (
    <div className="amap-trip-map" data-testid="amap-trip-map">
      <AmapContainer
        lng={center[0]}
        lat={center[1]}
        zoom={zoom}
        ariaLabel={`${city}行程路线地图`}
        onReady={setMap}
        className="amap-trip-container"
        cursor="grab"
      >
        {loading && (
          <div className="amap-trip-status" role="status">
            <Spin size="small" /> 正在解析途经点并规划路线…
          </div>
        )}
      </AmapContainer>
      <RouteLayer
        map={map}
        waypoints={waypoints}
        route={route}
        focusId={focusId}
        onFocus={(id) => {
          const waypoint = waypoints.find((entry) => entry.id === id);
          if (waypoint !== undefined) {
            onFocusStop?.(waypoint.name);
          }
        }}
      />
      {locationNote !== null && (
        <Alert
          className="amap-trip-alert"
          type="warning"
          showIcon
          title="途经点未能全部定位"
          description={locationNote}
        />
      )}
      {estimateNote !== null && (
        <Alert
          className="amap-trip-alert"
          type="info"
          showIcon
          title="已按直线显示行程"
          description={estimateNote}
        />
      )}
    </div>
  );
}