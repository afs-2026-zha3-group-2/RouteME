/**
 * 行程详情只读地图：按途经点名称做高德地理编码，再绘制步行路线。
 *
 * 与发布/探索页共用 AmapContainer + RouteLayer；不修改行程数据，也不提供
 * 编辑操作。解析失败时保留地图与其他途经点，并给出可读错误。
 */

import { useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import {
  amapErrorMessage,
  geocodePlace,
  planRoute,
  type RoutePlan,
  type RouteWaypoint,
} from './AmapService';
import { AmapContainer } from './AmapContainer';
import { RouteLayer } from './RouteLayer';
import type { AmapMap, LngLat } from './types';

type Props = {
  city: string;
  stops: string[];
  focusStop: string | null;
  onFocusStop?: (name: string) => void;
};

const DEFAULT_CENTER: LngLat = [113.2644, 23.1291];

export function AmapTripMap({ city, stops, focusStop, onFocusStop }: Props) {
  const [map, setMap] = useState<AmapMap | null>(null);
  const [center, setCenter] = useState<LngLat>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(12);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stopsKey = stops.join('\u0001');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
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
        setError(
          resolved.length === 0
            ? '未能解析途经点坐标，请检查高德 JS Key 与后端安全密钥配置。'
            : `有 ${stops.length - resolved.length} 个途经点未能定位，路线可能不完整。`,
        );
      } else {
        setError(null);
      }

      if (resolved.length >= 2) {
        try {
          const plan = await planRoute('walking', resolved);
          if (active) {
            setRoute(plan);
          }
        } catch (reason: unknown) {
          if (active) {
            setError(amapErrorMessage(reason));
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
  }, [city, stopsKey]);

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
      {error !== null && (
        <Alert
          className="amap-trip-alert"
          type="warning"
          showIcon
          title="路线暂时无法生成"
          description={error}
        />
      )}
    </div>
  );
}