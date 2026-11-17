/**
 * 发布/编辑表单里的地点选择器（高德版）。
 *
 * 搜索候选来自高德地点搜索；选中后写入表单名称列表，并在小地图上用编号 Marker
 * 展示。手动输入不再依赖离线地名库，但必须从搜索结果或地图点位中选择。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Typography, message as antdMessage } from 'antd';
import {
  amapErrorMessage,
  aroundPlaces,
  geocodePlace,
  type PlaceResult,
  type RouteWaypoint,
} from './AmapService';
import { AmapContainer } from './AmapContainer';
import { PlaceSearchBox } from './PlaceSearchBox';
import { RouteLayer } from './RouteLayer';
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
    if (value.includes(place.name)) {
      setMessage(`「${place.name}」已经在列表里了`);
      return;
    }
    if (mode === 'multi' && max !== undefined && value.length >= max) {
      setMessage(`最多选择 ${max} 个地点`);
      return;
    }
    cacheRef.current.set(cacheKey(place.name), place);
    setCacheVersion((previous) => previous + 1);
    onChange(mode === 'single' ? [place.name] : [...value, place.name]);
    setCenter([place.lng, place.lat]);
    setZoom(14);
    setMessage(null);
  };

  const remove = (name: string) => {
    onChange(value.filter((item) => item !== name));
    setMessage(null);
  };

  const handleMapClick = (point: LngLat) => {
    aroundPlaces(point[0], point[1], 300)
      .then((places) => {
        if (places.length === 0) {
          setMessage('附近没有找到可加入的地点，试试搜索名称。');
          return;
        }
        add(places[0]);
      })
      .catch((reason: unknown) => {
        antdMessage.warning(amapErrorMessage(reason));
      });
  };

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
            <div className="amap-picker-hint">点击地图上的地点也可加入</div>
          </AmapContainer>
          <RouteLayer map={map} waypoints={waypoints} route={null} focusId={null} />
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