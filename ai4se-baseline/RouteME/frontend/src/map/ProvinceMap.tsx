/**
 * Level 2 省级地图（refine-trip-map R2 / design D15）。
 *
 * 只负责「选择城市」：省轮廓＋城市节点，MUST NOT 出现城市间连线。
 * 广东手工布局（主 Demo 省）；其余省由区划字典＋确定性布局生成；
 * 直辖市/港澳显示单一城市节点。点击城市写路由进入 CityTravelMap。
 */

import { useMemo, useState } from 'react';
import { MapBreadcrumbs } from './MapBreadcrumbs';
import { MapControls } from './MapControls';
import { useMapViewport } from './useMapViewport';
import { AREA_OPTIONS } from '../area/areaOptions';
import { findProvinceShape } from './data/china';
import { citiesInProvince } from './data/index';
import { mulberry32, seedFromCode } from './data/procedural';
import type { Point } from './data/types';

type Props = {
  provinceCode: string;
  onSelectCity: (city: { code: string; name: string }) => void;
  onNavigateChina: () => void;
};

type CityNode = { code: string; name: string; point: Point };

/** 广东手工布局：城市节点相对位置贴合真实地理方位。 */
const GUANGDONG_LAYOUT: Record<string, Point> = {
  韶关: { x: 52, y: 18 },
  清远: { x: 40, y: 30 },
  广州: { x: 50, y: 46 },
  佛山: { x: 42, y: 51 },
  肇庆: { x: 28, y: 44 },
  惠州: { x: 64, y: 44 },
  东莞: { x: 56, y: 53 },
  深圳: { x: 62, y: 61 },
  中山: { x: 48, y: 60 },
  珠海: { x: 44, y: 67 },
  江门: { x: 36, y: 60 },
  阳江: { x: 26, y: 64 },
  湛江: { x: 20, y: 76 },
  汕头: { x: 80, y: 40 },
};

/** 广东手工省轮廓（示意口径，含雷州半岛西南伸出）。 */
const GUANGDONG_OUTLINE =
  'M 20 22 L 38 14 L 56 12 L 72 18 L 86 26 L 90 38 L 82 46 L 88 54 L 76 58 L 68 54 L 60 62 L 52 60 L 46 68 L 38 64 L 34 74 L 26 84 L 18 78 L 22 66 L 14 58 L 10 44 L 16 34 Z';

const MUNICIPALITIES = new Set(['110000', '120000', '310000', '500000']);

function provinceDisplayName(code: string): string {
  const option = AREA_OPTIONS.find((entry) => entry.value === code);
  return option?.label.replace(/省|市|特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区/g, '') ?? code;
}

/** 面包屑用完整省级名（广东省 / 广西壮族自治区 / 北京市）。 */
function provinceFullName(code: string): string {
  return AREA_OPTIONS.find((entry) => entry.value === code)?.label ?? code;
}

/** 非广东省：字典城市＋确定性布局（seed=省码+市码），铺在放大的省形内。 */
function dictionaryNodes(provinceCode: string): CityNode[] {
  const option = AREA_OPTIONS.find((entry) => entry.value === provinceCode);
  const children = option?.children ?? [];
  if (MUNICIPALITIES.has(provinceCode)) {
    const first = children[0];
    return [{ code: first?.value ?? provinceCode, name: provinceDisplayName(provinceCode), point: { x: 50, y: 50 } }];
  }
  if (provinceCode === '810000' || provinceCode === '820000') {
    return [{ code: provinceCode, name: provinceDisplayName(provinceCode), point: { x: 50, y: 50 } }];
  }
  return children.map((child) => {
    const random = mulberry32(seedFromCode(`${provinceCode}-${child.value}`));
    return {
      code: child.value,
      name: child.label.replace(/市$/, ''),
      point: { x: 18 + random() * 64, y: 18 + random() * 64 },
    };
  });
}

/** 把 china.ts 的低多边形省形放大铺满 12..88 视口。 */
function scaledProvincePath(provinceCode: string): string | null {
  const shape = findProvinceShape(provinceCode);
  if (shape === undefined) {
    return null;
  }
  const xs = shape.points.map((point) => point.x);
  const ys = shape.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const side = 76;
  const mapped = shape.points.map((point) => ({
    x: 12 + ((point.x - minX) / spanX) * side,
    y: 12 + ((point.y - minY) / spanY) * side,
  }));
  return `${mapped.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')} Z`;
}

export function ProvinceMap({ provinceCode, onSelectCity, onNavigateChina }: Props) {
  const viewport = useMapViewport();
  const { view, svgRef, fullscreen, setFullscreen } = viewport;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const isGuangdong = provinceCode === '440000';
  const displayName = provinceDisplayName(provinceCode);

  const nodes = useMemo<CityNode[]>(() => {
    if (!isGuangdong) {
      return dictionaryNodes(provinceCode);
    }
    return citiesInProvince(provinceCode).map((city) => ({
      code: city.code,
      name: city.name,
      point: GUANGDONG_LAYOUT[city.name] ?? { x: 50, y: 50 },
    }));
  }, [provinceCode, isGuangdong]);

  const outline = isGuangdong ? GUANGDONG_OUTLINE : scaledProvincePath(provinceCode);
  const scale = view.w / 100;

  return (
    <div className={fullscreen ? 'map-shell is-fullscreen' : 'map-shell'}>
      <MapBreadcrumbs
        items={[{ label: '中国', onClick: onNavigateChina }, { label: provinceFullName(provinceCode) }]}
      />
      <div className="map-viewport">
        <svg
          className="map-canvas"
          data-testid="province-map"
          data-level="province"
          data-province={provinceCode}
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={`${displayName}省级地图：点击城市进入城市旅行地图，拖动平移，滚轮或按钮缩放`}
          onPointerDown={viewport.onPointerDown}
          onPointerMove={viewport.onPointerMove}
          onPointerUp={viewport.endDrag}
          onPointerCancel={viewport.endDrag}
        >
          <rect x={-100} y={-100} width={300} height={300} className="map-ground" />
          {outline !== null && <path className="map-province-outline" d={outline} />}
          {/* 城市节点：只选城市，不画城市间连线（spec MUST NOT）。 */}
          {nodes.map((node) => {
            const hovered = hoveredCode === node.code;
            return (
              <g
                key={node.code}
                className={`map-city-node${hovered ? ' hovered' : ''}`}
                data-city-code={node.code}
                data-city-name={node.name}
                role="button"
                tabIndex={0}
                aria-label={`${node.name}（城市）`}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerEnter={() => setHoveredCode(node.code)}
                onPointerLeave={() => setHoveredCode((previous) => (previous === node.code ? null : previous))}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCity({ code: node.code, name: node.name });
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectCity({ code: node.code, name: node.name });
                  }
                }}
              >
                <title>{node.name}</title>
                <circle className="map-city-hit" cx={node.point.x} cy={node.point.y} r={3.4 * scale} />
                <circle
                  className="map-city-dot"
                  cx={node.point.x}
                  cy={node.point.y}
                  r={(hovered ? 2.2 : 1.8) * scale}
                  style={{ strokeWidth: 0.5 * scale }}
                />
                <text
                  className="map-city-label"
                  x={node.point.x}
                  y={node.point.y + 4.4 * scale}
                  textAnchor="middle"
                  style={{ fontSize: `${2.7 * scale}px` }}
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="map-scope-card" aria-hidden="true">
          <b>{displayName}</b>
          <span>{nodes.length} 个城市 · 点击选城市</span>
        </div>
        <MapControls
          view={view}
          fullscreen={fullscreen}
          onZoom={viewport.zoomBy}
          onReset={viewport.resetView}
          onToggleFullscreen={() => setFullscreen((previous) => !previous)}
        />
      </div>
      <p className="map-hint">点击城市进入城市旅行地图；面包屑可返回中国地图。</p>
    </div>
  );
}