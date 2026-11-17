/**
 * 高德地图容器：只负责脚本加载、Map 实例、通用控件与基础状态。
 *
 * 业务数据（途经点、路线、同行者）不进入本组件；通过 onReady 把地图实例交给
 * 上层，RouteLayer 等覆盖层再用独立数据模型绘制。
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Spin, Typography } from 'antd';
import { amapErrorMessage, resetProxyProbe } from './AmapService';
import { loadAmap } from './loader';
import type { AmapMap, LngLat } from './types';

type Props = {
  /** 经度。 */
  lng: number;
  /** 纬度。 */
  lat: number;
  zoom: number;
  ariaLabel: string;
  children?: ReactNode;
  className?: string;
  onReady?: (map: AmapMap) => void;
  onMapClick?: (point: LngLat) => void;
};

const MIN_ZOOM = 4;
const MAX_ZOOM = 19;

export function AmapContainer({
  lng,
  lat,
  zoom,
  ariaLabel,
  children,
  className,
  onReady,
  onMapClick,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AmapMap | null>(null);
  const onReadyRef = useRef(onReady);
  const onMapClickRef = useRef(onMapClick);
  onReadyRef.current = onReady;
  onMapClickRef.current = onMapClick;

  const [map, setMap] = useState<AmapMap | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }
    let active = true;
    let instance: AmapMap | null = null;
    const onCanvasClick = (event: { lnglat?: { getLng(): number; getLat(): number } }) => {
      if (event.lnglat !== undefined) {
        onMapClickRef.current?.([event.lnglat.getLng(), event.lnglat.getLat()]);
      }
    };

    setStatus('loading');
    setError(null);
    loadAmap()
      .then((AMap) => {
        if (!active) {
          return;
        }
        instance = new AMap.Map(host, {
          zoom,
          center: [lng, lat],
          viewMode: '2D',
          resizeEnable: true,
          features: ['bg', 'road', 'building', 'point'],
          showLabel: true,
          mapStyle: 'amap://styles/normal',
        });
        instance.on('click', onCanvasClick);
        mapRef.current = instance;
        setMap(instance);
        setStatus('ready');
        onReadyRef.current?.(instance);
      })
      .catch((reason: unknown) => {
        if (active) {
          setStatus('error');
          setError(amapErrorMessage(reason));
        }
      });

    return () => {
      active = false;
      if (instance !== null) {
        instance.off('click', onCanvasClick);
        instance.destroy();
      }
      mapRef.current = null;
      setMap(null);
    };
    // 只创建一次；中心点与缩放通过下面的同步 effect 更新。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (map === null) {
      return;
    }
    map.setZoomAndCenter(zoom, [lng, lat]);
  }, [map, lng, lat, zoom]);

  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.resize(), 80);
    return () => window.clearTimeout(timer);
  }, [fullscreen, map]);

  const locate = () => {
    if (mapRef.current === null) {
      return;
    }
    if (!('geolocation' in navigator)) {
      setLocateError('当前浏览器不支持定位');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        mapRef.current?.setZoomAndCenter(15, [
          position.coords.longitude,
          position.coords.latitude,
        ]);
      },
      () => {
        setLocating(false);
        setLocateError('定位失败，请检查浏览器定位权限后重试');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const zoomBy = (delta: number) => {
    const instance = mapRef.current;
    if (instance === null) {
      return;
    }
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, instance.getZoom() + delta));
    instance.setZoom(next);
  };

  return (
    <div
      className={['amap-container', fullscreen ? 'is-fullscreen' : '', className ?? '']
        .filter((entry) => entry !== '')
        .join(' ')}
      data-testid="amap-container"
      data-status={status}
      role="region"
      aria-label={ariaLabel}
    >
      <div className="amap-canvas-host" ref={hostRef} />

      {status === 'loading' && (
        <div className="amap-state" role="status">
          <Spin size="small" />
          <Typography.Text type="secondary">正在加载高德地图…</Typography.Text>
        </div>
      )}
      {status === 'error' && (
        <div className="amap-state amap-state-error" role="alert">
          <Typography.Text>{error}</Typography.Text>
          <Button
            size="small"
            onClick={() => {
              // 用户可能刚启动后端；清掉缓存的探测与插件状态后重试。
              resetProxyProbe();
              setAttempt((previous) => previous + 1);
            }}
          >
            重新加载地图
          </Button>
        </div>
      )}

      {status === 'ready' && (
        <div className="amap-controls" role="group" aria-label="地图控制">
          <button type="button" aria-label="放大地图" onClick={() => zoomBy(1)}>
            +
          </button>
          <button type="button" aria-label="缩小地图" onClick={() => zoomBy(-1)}>
            −
          </button>
          <button type="button" aria-label="定位到我的位置" onClick={locate} disabled={locating}>
            {locating ? '…' : '◎'}
          </button>
          <button
            type="button"
            aria-label={fullscreen ? '退出全屏地图' : '全屏查看地图'}
            onClick={() => setFullscreen((previous) => !previous)}
          >
            {fullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      )}

      {locateError !== null && (
        <div className="amap-locate-error" role="alert">
          <span>{locateError}</span>
          <button type="button" aria-label="关闭定位失败提示" onClick={() => setLocateError(null)}>
            ×
          </button>
        </div>
      )}

      {children}
    </div>
  );
}