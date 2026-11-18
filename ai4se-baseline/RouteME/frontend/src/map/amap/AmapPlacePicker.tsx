/**
 * 发布/编辑表单里的地点选择器（高德版）。
 *
 * 两条入口：搜索候选（高德地点搜索）与「直接点地图」。点地图得到的坐标就是
 * 用户点的位置，名称只靠逆地理补全——即使高德服务不可用，选点仍然可用且精确。
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Typography, message as antdMessage } from 'antd';
import {
  amapErrorMessage,
  geocodePlace,
  reverseGeocode,
  type PlaceResult,
  type RouteWaypoint,
} from './AmapService';
import { AmapContainer } from './AmapContainer';
import { PlaceSearchBox } from './PlaceSearchBox';
import { RouteLayer } from './RouteLayer';
import {
  findSamePoint,
  formatCoords,
  pickedPlaceName,
  pointFallbackName,
  toPickedPlace,
  type PickedPoint,
} from './placePick';
import type { AmapMap, LngLat } from './types';

type Props = {
  mode: 'single' | 'multi';
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
  emptyHint?: string;
  ariaLabel?: string;
  inputId?: string;
  invalid?: boolean;
  showMap?: boolean;
  city?: string;
};

const DEFAULT_CENTER: LngLat = [113.2644, 23.1291];

export function AmapPlacePicker({
  mode,
  value,
  onChange,
  max,
  placeholder,
  emptyHint,
  ariaLabel,
  inputId,
  invalid = false,
  showMap = true,
  city,
}: Props) {
  const cacheRef = useRef(new Map<string, PlaceResult>());
  const [cacheVersion, setCacheVersion] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [map, setMap] = useState<AmapMap | null>(null);
  const [center, setCenter] = useState<LngLat>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(11);
  /** 刚在地图上点下、尚未确认加入的点（坐标就是点击位置）。 */
  const [pending, setPending] = useState<{ point: PickedPoint; loading: boolean } | null>(null);
  /** 点开已有途经点时展示的信息点 id。 */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const valueKey = value.join('\u0001');

  const cacheKey = (name: string) => `${city ?? ''}|${name}`;

  const resolved = useMemo(
    () =>
      value
        .map((name) => cacheRef.current.get(cacheKey(name)))
        .filter((place): place is PlaceResult => place !== undefined),
    // cacheVersion makes cache mutations visible without putting a Map in state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [valueKey, cacheVersion, city],
  );

  // 初始值（编辑已有行程）不在搜索缓存里，按名称补一次地理编码。
  useEffect(() => {
    let active = true;
    const missing = value.filter((name) => !cacheRef.current.has(cacheKey(name)));
    if (missing.length === 0) {
      return;
    }
    Promise.all(missing.map((name) => geocodePlace(name, city).catch(() => null))).then(
      (places) => {
        if (!active) {
          return;
        }
        let changed = false;
        places.forEach((place, index) => {
          if (place !== null) {
            cacheRef.current.set(cacheKey(missing[index]), place);
            changed = true;
          }
        });
        if (changed) {
          setCacheVersion((previous) => previous + 1);
        }
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey, city]);

  useEffect(() => {
    if (resolved.length > 0) {
      setCenter([resolved[0].lng, resolved[0].lat]);
      setZoom(13);
      return;
    }
    if (city === undefined || city === '') {
      return;
    }
    let active = true;
    geocodePlace(city, city)
      .then((place) => {
        if (active && place !== null) {
          setCenter([place.lng, place.lat]);
          setZoom(11);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [city, resolved]);

  const add = (place: PlaceResult) => {
    const same = findSamePoint(resolved, place.lng, place.lat);
    if (same !== undefined) {
      setMessage(`「${same.name}」已经在这个位置上了`);
      setPending(null);
      return;
    }
    if (mode === 'multi' && max !== undefined && value.length >= max) {
      setMessage(`最多选择 ${max} 个地点`);
      return;
    }
    // 同名地点追加坐标，避免表单里两条途经点同名互相覆盖。
    const name = pickedPlaceName(place.name, place.lng, place.lat, value);
    const stored: PlaceResult = { ...place, name };
    cacheRef.current.set(cacheKey(name), stored);
    setCacheVersion((previous) => previous + 1);
    onChange(mode === 'single' ? [name] : [...value, name]);
    setCenter([place.lng, place.lat]);
    setZoom(14);
    setMessage(null);
    setPending(null);
    setFocusedId(null);
  };

  const remove = (name: string) => {
    onChange(value.filter((item) => item !== name));
    setMessage(null);
    setFocusedId(null);
  };

  /**
   * 地图点击：先记住精确坐标，再用逆地理补名称。
   * 逆地理失败不影响选点——绝不像以前那样退回到「取最近的 POI」，那会把点挪走。
   */
  const handleMapClick = (point: LngLat) => {
    const picked: PickedPoint = { lng: point[0], lat: point[1], place: null };
    setFocusedId(null);
    setPending({ point: picked, loading: true });
    reverseGeocode(point[0], point[1])
      .then((place) => setPending({ point: { ...picked, place }, loading: false }))
      .catch((reason: unknown) => {
        setPending({ point: picked, loading: false });
        antdMessage.warning(amapErrorMessage(reason));
      });
  };

  const confirmPending = () => {
    if (pending === null) {
      return;
    }
    const { point } = pending;
    const name = point.place?.name ?? pointFallbackName(point.lng, point.lat);
    add(toPickedPlace(point, name));
  };

  const focusedPlace =
    focusedId === null ? undefined : resolved.find((place) => place.id === focusedId);

  const waypoints: RouteWaypoint[] = resolved.map((place) => ({
    id: place.id,
    name: place.name,
    address: place.address,
    lng: place.lng,
    lat: place.lat,
  }));

  return (
    <div className="place-picker">
      <PlaceSearchBox
        city={city}
        onPick={add}
        placeholder={placeholder ?? '搜索城市、景点或地址，必须从候选中选择'}
        inputId={inputId}
        ariaLabel={ariaLabel ?? '搜索地图地点'}
        invalid={invalid}
      />

      {mode === 'multi' && value.length > 0 && (
        <ol className="place-chips">
          {value.map((name, index) => (
            <li key={`${name}-${index}`} className="place-chip">
              <span className="place-chip-index">{index + 1}</span>
              <span className="place-chip-name">{name}</span>
              <button
                type="button"
                className="place-chip-remove"
                aria-label={`移除 ${name}`}
                onClick={() => remove(name)}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      {mode === 'single' && value.length > 0 && (
        <div className="place-chips">
          <span className="place-chip">
            <span className="place-chip-name">{value[0]}</span>
            <button
              type="button"
              className="place-chip-remove"
              aria-label={`移除 ${value[0]}`}
              onClick={() => remove(value[0])}
            >
              ×
            </button>
          </span>
        </div>
      )}

      {showMap && (
        <div className="amap-picker-map">
          <AmapContainer
            lng={center[0]}
            lat={center[1]}
            zoom={zoom}
            ariaLabel="选择途经点的地图"
            onReady={setMap}
            onMapClick={handleMapClick}
          >
            <div className="amap-picker-hint">点击地图选精确位置 · 滚轮缩放 · 拖动平移</div>
          </AmapContainer>
          <RouteLayer
            map={map}
            waypoints={waypoints}
            route={null}
            focusId={focusedId}
            onFocus={(id) => {
              setPending(null);
              setFocusedId((previous) => (previous === id ? null : id));
            }}
          />
          {pending !== null && (
            <MapCallout
              map={map}
              lng={pending.point.lng}
              lat={pending.point.lat}
              name={
                pending.loading
                  ? '正在识别位置…'
                  : (pending.point.place?.name ?? pointFallbackName(pending.point.lng, pending.point.lat))
              }
              address={pending.point.place?.address ?? ''}
              approximate={pending.point.place?.approximate === true}
              actions={
                <>
                  <Button size="small" type="primary" disabled={pending.loading} onClick={confirmPending}>
                    加入
                  </Button>
                  <Button size="small" onClick={() => setPending(null)}>
                    取消
                  </Button>
                </>
              }
            />
          )}
          {pending === null && focusedPlace !== undefined && (
            <MapCallout
              map={map}
              lng={focusedPlace.lng}
              lat={focusedPlace.lat}
              name={focusedPlace.name}
              address={focusedPlace.address}
              approximate={focusedPlace.approximate === true}
              actions={
                <>
                  <Button size="small" danger onClick={() => remove(focusedPlace.name)}>
                    移除
                  </Button>
                  <Button size="small" onClick={() => setFocusedId(null)}>
                    关闭
                  </Button>
                </>
              }
            />
          )}
          {resolved.length < value.length && (
            <Typography.Text type="secondary" className="amap-picker-status">
              部分地点还在解析坐标…
            </Typography.Text>
          )}
        </div>
      )}

      {message !== null ? (
        <Typography.Text type="warning" className="place-message">
          {message}
        </Typography.Text>
      ) : (
        emptyHint !== undefined && <Typography.Text type="secondary">{emptyHint}</Typography.Text>
      )}
    </div>
  );
}

type MapCalloutProps = {
  map: AmapMap | null;
  lng: number;
  lat: number;
  name: string;
  address: string;
  /** 离线地名库反推的坐标：必须标注为示意位置。 */
  approximate: boolean;
  actions: ReactNode;
};

/**
 * 选中位置的信息卡：钉在点击点上，随地图拖动 / 缩放一起移动。
 *
 * <p>名称、地址、经纬度三行固定展示——用户要能看到「我到底选了哪儿」，
 * 而不是只看一个不知道偏了多少的标签。
 */
function MapCallout({ map, lng, lat, name, address, approximate, actions }: MapCalloutProps) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (map === null) {
      return;
    }
    return map.onChange(() => setVersion((previous) => previous + 1));
  }, [map]);

  if (map === null || map.overlay === null) {
    return null;
  }
  const point = map.project([lng, lat]);
  return createPortal(
    <div
      className="amap-point-callout"
      style={{ left: `${point.x}px`, top: `${point.y}px` }}
      data-testid="amap-point-callout"
    >
      <span className="amap-point-pin" aria-hidden="true" />
      <div className="amap-point-card" role="dialog" aria-label="选中位置信息">
        <b className="amap-point-name">{name}</b>
        {address !== '' && <span className="amap-point-address">{address}</span>}
        <span className="amap-point-coords">{formatCoords(lng, lat)}</span>
        {approximate && <span className="amap-point-flag">内置地名 · 示意位置</span>}
        <div className="amap-point-actions">{actions}</div>
      </div>
    </div>,
    map.overlay,
  );
}