/**
 * 地图容器：栅格底图、通用控件与基础状态。
 *
 * 业务数据（途经点、路线、同行者）不进入本组件；通过 onReady 把地图实例交给
 * 上层，RouteLayer 等覆盖层再用独立数据模型绘制。底图实现见 `rasterMap.ts`
 * （高德矢量引擎在本仓库的网络环境里无法初始化，详见该文件说明）。
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Spin, Typography } from 'antd';
import { resetProxyProbe } from './AmapService';
import { wgs84ToGcj02 } from './geoDatum';
import { createRasterMap } from './rasterMap';
import './rasterMap.css';
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

/** 连续加载失败多少张瓦片后判定底图不可用（避免个别瓦片失败就报错）。 */
const TILE_FAILURE_LIMIT = 4;

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
  const viewRef = useRef({ lng, lat, zoom });
  onReadyRef.current = onReady;
  onMapClickRef.current = onMapClick;
  viewRef.current = { lng, lat, zoom };

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
    setStatus('loading');
    setError(null);

    const view = viewRef.current;
    const instance = createRasterMap(host, {
      center: [view.lng, view.lat],
      zoom: view.zoom,
      onClick: (point) => onMapClickRef.current?.(point),
      onTileStatus: ({ loaded, failed }) => {
        if (loaded > 0) {
          setStatus('ready');
        } else if (failed >= TILE_FAILURE_LIMIT) {
          setStatus('error');
          setError('底图瓦片加载失败，请检查网络后重试。');
        }
      },
    });
    mapRef.current = instance;
    setMap(instance);
    onReadyRef.current?.(instance);

    return () => {
      instance.destroy();
      mapRef.current = null;
      setMap(null);
    };
    // 只有「重新加载」需要重建实例；视野变化由下面的同步 effect 更新。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    map?.setZoomAndCenter(zoom, [lng, lat]);
  }, [map, lng, lat, zoom]);

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
        // 浏览器给的是 WGS-84，底图是 GCJ-02：不纠偏会稳定偏出几百米。
        const point = wgs84ToGcj02(position.coords.longitude, position.coords.latitude);
        mapRef.current?.setZoomAndCenter(15, [point.lng, point.lat]);
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
    instance.setZoom(instance.getZoom() + delta);
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
      aria-busy={status === 'loading'}
    >
      <div className="amap-canvas-host" ref={hostRef} />

      {status === 'loading' && (
        <div className="amap-state" role="status">
          <Spin size="small" />
          <Typography.Text type="secondary">正在加载地图…</Typography.Text>
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