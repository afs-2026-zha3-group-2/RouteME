/**
 * 景点图钉层：把附近的高德「风景名胜」画成可点击的小圆点。
 *
 * <p>底图是高德栅格瓦片，只有注记文字、没有可点的景点；本层补回「景点型地图」
 * 的交互：点球标即把该景点加入途经点。与 RouteLayer 一样用 portal 渲染到
 * `map.overlay`，随地图平移/缩放重算像素位置。
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NearbyPlace } from './AmapService';
import type { AmapMap } from './types';
import './scenicLayer.css';

type Props = {
  map: AmapMap | null;
  spots: NearbyPlace[];
  /** 已加入途经点的景点 id：置灰且不再重复添加。 */
  addedIds?: string[];
  onPick?: (spot: NearbyPlace) => void;
};

export function ScenicLayer({ map, spots, addedIds = [], onPick }: Props) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (map === null) {
      return;
    }
    return map.onChange(() => setVersion((previous) => previous + 1));
  }, [map]);

  if (map === null || map.overlay === null || spots.length === 0) {
    return null;
  }

  return createPortal(
    <>
      {spots.map((spot) => {
        const point = map.project([spot.lng, spot.lat]);
        const added = addedIds.includes(spot.id);
        return (
          <button
            key={spot.id}
            type="button"
            className={['amap-scenic-pin', added ? 'is-added' : ''].filter(Boolean).join(' ')}
            style={{ left: `${point.x}px`, top: `${point.y}px` }}
            title={spot.address === '' ? spot.name : `${spot.name} · ${spot.address}`}
            aria-label={added ? `${spot.name}（已加入）` : `加入景点 ${spot.name}`}
            data-testid="amap-scenic-pin"
            onClick={() => {
              if (!added) {
                onPick?.(spot);
              }
            }}
          >
            <span className="amap-scenic-dot" aria-hidden="true" />
            <span className="amap-scenic-name">{spot.name}</span>
          </button>
        );
      })}
    </>,
    map.overlay,
  );
}