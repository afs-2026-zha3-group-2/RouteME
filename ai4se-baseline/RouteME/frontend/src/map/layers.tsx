/**
 * 城市旅行地图六个独立 SVG Layer（refine-trip-map R2 / design D15）。
 *
 * 全部为纯 <g> 组件：props 数据驱动，无内部 fetch / 无全局状态。
 * 视觉优先级（D19）：路线 > POI > 同行者 > 底图（道路/水域/公园/分区）。
 * scale = view.w / 100，保证线宽/字号随缩放保持屏幕观感一致。
 */

import { useId, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { routePath } from './mapView';
import type { District, ParkBlock, Poi, Road, Traveler, WaterBand } from './data/types';

export function RoadLayer({ roads, scale }: { roads: Road[]; scale: number }) {
  return (
    <g className="map-layer-roads" data-layer="road" aria-hidden="true">
      {roads.map((road, index) => (
        <g key={`road-${index}`}>
          {road.major && (
            <line
              className="map-road casing"
              x1={road.x1}
              y1={road.y1}
              x2={road.x2}
              y2={road.y2}
              style={{ strokeWidth: 1.15 * scale }}
            />
          )}
          <line
            className={road.major ? 'map-road major' : 'map-road'}
            x1={road.x1}
            y1={road.y1}
            x2={road.x2}
            y2={road.y2}
            style={{ strokeWidth: (road.major ? 0.8 : 0.45) * scale }}
          />
        </g>
      ))}
    </g>
  );
}

export function WaterLayer({ water, scale }: { water: WaterBand[]; scale: number }) {
  return (
    <g className="map-layer-water" data-layer="water" aria-hidden="true">
      {water.map((band, index) => (
        <g key={`water-${index}`}>
          <path className="map-water-band" d={band.path} style={{ strokeWidth: band.width * scale }} />
          <path
            className="map-water-band inner"
            d={band.path}
            style={{ strokeWidth: band.width * 0.45 * scale }}
          />
        </g>
      ))}
    </g>
  );
}

export function ParkLayer({
  parks,
  districts,
  scale,
}: {
  parks: ParkBlock[];
  districts: District[];
  scale: number;
}) {
  return (
    <g className="map-layer-parks" data-layer="park" aria-hidden="true">
      {parks.map((park, index) => (
        <g key={`park-${index}`}>
          <rect className="map-park-block" x={park.x} y={park.y} width={park.w} height={park.h} rx={1.2 * scale} />
          {[0.28, 0.62].map((fx, treeIndex) => (
            <g key={`tree-${treeIndex}`} className="map-tree">
              <circle
                cx={park.x + park.w * fx}
                cy={park.y + park.h * (treeIndex % 2 === 0 ? 0.4 : 0.62) - 0.5 * scale}
                r={0.55 * scale}
              />
              <line
                x1={park.x + park.w * fx}
                y1={park.y + park.h * (treeIndex % 2 === 0 ? 0.4 : 0.62)}
                x2={park.x + park.w * fx}
                y2={park.y + park.h * (treeIndex % 2 === 0 ? 0.4 : 0.62) + 0.5 * scale}
                style={{ strokeWidth: 0.18 * scale }}
              />
            </g>
          ))}
        </g>
      ))}
      {districts.map((district) => (
        <text
          key={district.name}
          className="map-district"
          x={district.x}
          y={district.y}
          textAnchor="middle"
          style={{ fontSize: `${2.1 * scale}px` }}
        >
          {district.name}
        </text>
      ))}
    </g>
  );
}

/** 水滴 pin 轮廓（单位坐标，锚点在原点）。 */
const PIN_PATH =
  'M0,0 C-1.5,-2 -2.2,-3.2 -2.2,-4.5 A2.2,2.2 0 1,1 2.2,-4.5 C2.2,-3.2 1.5,-2 0,0 Z';

export type PoiLayerProps = {
  pois: Poi[];
  /** 已选景点 id（有序，编号 = 下标 + 1）。 */
  selected: string[];
  scale: number;
  activePoiId?: string | null;
  onTogglePoi?: (poi: Poi, event?: ReactMouseEvent) => void;
  onFocusPoi?: (poi: Poi) => void;
};

export function PoiLayer({ pois, selected, scale, activePoiId, onTogglePoi, onFocusPoi }: PoiLayerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <g className="map-layer-pois" data-layer="poi">
      {pois.map((poi) => {
        const selectedIndex = selected.indexOf(poi.id);
        const isSelected = selectedIndex >= 0;
        const emphasized = hoveredId === poi.id || activePoiId === poi.id || isSelected;
        const nearRight = poi.x > 72;
        const activate = (event: ReactMouseEvent) => {
          event.stopPropagation();
          if (isSelected) {
            // 已选 pin 点击只聚焦（R1 语义）；移除走信息卡/行程列表。
            onFocusPoi?.(poi);
            return;
          }
          onTogglePoi?.(poi, event);
        };
        return (
          <g
            key={poi.id}
            className={`map-pin poi${emphasized ? ' active' : ''}${isSelected ? ' selected' : ''}`}
            data-testid="poi-pin"
            data-poi-id={poi.id}
            role="button"
            tabIndex={0}
            aria-label={`${poi.name}（景点）${isSelected ? `，行程第 ${selectedIndex + 1} 站` : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerEnter={() => setHoveredId(poi.id)}
            onPointerLeave={() => setHoveredId((previous) => (previous === poi.id ? null : previous))}
            onClick={activate}
            onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (isSelected) {
                  onFocusPoi?.(poi);
                } else {
                  onTogglePoi?.(poi);
                }
              }
            }}
          >
            <title>{poi.name}</title>
            <circle className="map-pin-hit" cx={poi.x} cy={poi.y} r={2.4 * scale} />
            {isSelected ? (
              <g transform={`translate(${poi.x} ${poi.y}) scale(${scale})`}>
                <circle className="map-selected-anchor" cx={0} cy={0} r={0.8} />
                <path className="map-pin-teardrop" d={PIN_PATH} />
                <text className="map-selected-index" x={0} y={-3.6} textAnchor="middle">
                  {selectedIndex + 1}
                </text>
              </g>
            ) : (
              <circle
                className="map-pin-dot"
                cx={poi.x}
                cy={poi.y}
                r={(emphasized ? 1.8 : 1.4) * scale}
                style={{ strokeWidth: 0.5 * scale }}
              />
            )}
            <text
              className="map-pin-label"
              x={poi.x + (nearRight ? -3 : 3) * scale}
              y={poi.y + (isSelected ? -5.4 : 3.4) * scale}
              textAnchor={nearRight ? 'end' : 'start'}
              style={{ fontSize: `${2.6 * scale}px` }}
            >
              {poi.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export type RouteLayerProps = {
  /** 按行程顺序排列的景点坐标。 */
  points: Array<{ x: number; y: number }>;
  scale: number;
  onFocusIndex?: (index: number) => void;
};

/** 用户旅行路线：蓝→紫渐变＋白 casing＋编号圆徽（与行程列表同步）。 */
export function RouteLayer({ points, scale, onFocusIndex }: RouteLayerProps) {
  const gradientId = useId();
  if (points.length < 2) {
    return null;
  }
  const d = routePath(points);
  return (
    <g className="map-layer-route" data-layer="route">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--map-route-from)" />
          <stop offset="100%" stopColor="var(--map-route-to)" />
        </linearGradient>
      </defs>
      <path className="map-route-casing" d={d} style={{ strokeWidth: 2 * scale }} aria-hidden="true" />
      <path
        className="map-route-line"
        d={d}
        stroke={`url(#${gradientId})`}
        style={{ strokeWidth: 1.1 * scale }}
        aria-hidden="true"
      />
      {points.map((point, index) => (
        <g
          key={`route-badge-${index}`}
          className="map-route-badge"
          role="button"
          tabIndex={0}
          aria-label={`行程第 ${index + 1} 站`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onFocusIndex?.(index);
          }}
          onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onFocusIndex?.(index);
            }
          }}
        >
          <circle cx={point.x} cy={point.y} r={1.5 * scale} style={{ strokeWidth: 0.45 * scale }} />
          <text x={point.x} y={point.y + 0.55 * scale} textAnchor="middle" style={{ fontSize: `${1.7 * scale}px` }}>
            {index + 1}
          </text>
        </g>
      ))}
    </g>
  );
}

export type TravelerLayerProps = {
  /** 聚合气泡锚点（城市局部坐标）。 */
  anchor: { x: number; y: number };
  scale: number;
  /** 最高重合度（travelerMatch 纯函数计算，UI 不存常量）。 */
  topPercent: number;
  count: number;
  onOpen: () => void;
};

/** 同行者聚合气泡：重合度％＋人数＋查看入口（数据驱动）。 */
export function TravelerLayer({ anchor, scale, topPercent, count, onOpen }: TravelerLayerProps) {
  if (count <= 0) {
    return null;
  }
  const width = 26 * scale;
  const height = 9 * scale;
  return (
    <g className="map-layer-travelers" data-layer="traveler">
      <foreignObject
        x={anchor.x - width / 2}
        y={anchor.y - height / 2}
        width={width}
        height={height}
      >
        <button
          type="button"
          className="traveler-bubble"
          data-testid="traveler-bubble"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`${topPercent}% 同路，${count} 位同行者，查看同行者`}
        >
          <span className="traveler-bubble-faces" aria-hidden="true">👤👤👤</span>
          <span className="traveler-bubble-match">{topPercent}% 同路</span>
          <span className="traveler-bubble-count">{count} 位同行者</span>
          <span className="traveler-bubble-cta">查看同行者 ›</span>
        </button>
      </foreignObject>
    </g>
  );
}

export type { Traveler };