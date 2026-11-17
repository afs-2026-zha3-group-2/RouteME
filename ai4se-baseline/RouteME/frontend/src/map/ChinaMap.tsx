/**
 * Level 1 中国地图（refine-trip-map R2 / design D15）。
 *
 * 只负责「选择省份」：34 省级单元离线简化省形，hover / selected / 点击进省；
 * 搜索省份或城市直达对应层级。不渲染景点 / 路线 / 同行者。
 * 换层通过 onSelectProvince / onSelectCity 回调写路由，Zoom 只缩放本图。
 */

import { useMemo, useState } from 'react';
import { Input, Typography } from 'antd';
import { MapBreadcrumbs } from './MapBreadcrumbs';
import { MapControls } from './MapControls';
import { useMapViewport } from './useMapViewport';
import { PROVINCE_SHAPES, provinceShapePath } from './data/china';
import { CITY_INDEX, type CityIndex } from './data/index';

type Props = {
  onSelectProvince: (provinceCode: string) => void;
  onSelectCity: (city: CityIndex) => void;
};

type SearchEntry =
  | { kind: 'province'; code: string; name: string }
  | { kind: 'city'; city: CityIndex };

const SEARCH_POOL: SearchEntry[] = [
  ...PROVINCE_SHAPES.map((shape) => ({ kind: 'province' as const, code: shape.code, name: shape.name })),
  ...CITY_INDEX.map((city) => ({ kind: 'city' as const, city })),
];

export function ChinaMap({ onSelectProvince, onSelectCity }: Props) {
  const viewport = useMapViewport();
  const { view, svgRef, fullscreen, setFullscreen, movedRef } = viewport;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') {
      return [];
    }
    const matched: SearchEntry[] = [];
    for (const entry of SEARCH_POOL) {
      const names =
        entry.kind === 'province' ? [entry.name] : [entry.city.name, ...entry.city.aliases];
      if (names.some((name) => name.toLowerCase().includes(needle))) {
        matched.push(entry);
      }
    }
    return matched.slice(0, 8);
  }, [query]);

  const choose = (entry: SearchEntry) => {
    setQuery('');
    if (entry.kind === 'province') {
      onSelectProvince(entry.code);
    } else {
      onSelectCity(entry.city);
    }
  };

  const scale = view.w / 100;

  return (
    <div className={fullscreen ? 'map-shell is-fullscreen' : 'map-shell'}>
      <MapBreadcrumbs items={[{ label: '中国' }]} />
      <div className="map-search">
        <Input
          value={query}
          allowClear
          placeholder="搜索省份或城市，如 广东 / 广州"
          aria-label="搜索省份或城市"
          data-testid="china-map-search"
          onChange={(event) => setQuery(event.target.value)}
          onPressEnter={() => {
            if (suggestions.length > 0) {
              choose(suggestions[0]);
            }
          }}
        />
        {query.trim() !== '' && suggestions.length > 0 && (
          <ul className="place-suggest" role="listbox" aria-label="省份或城市候选">
            {suggestions.map((entry) => (
              <li key={entry.kind === 'province' ? entry.code : entry.city.code}>
                <button type="button" className="place-suggest-item" onClick={() => choose(entry)}>
                  <span className="place-suggest-name">
                    {entry.kind === 'province' ? entry.name : entry.city.name}
                  </span>
                  <span className="place-suggest-meta">
                    {entry.kind === 'province' ? '省份' : `城市 · ${entry.city.provinceName}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim() !== '' && suggestions.length === 0 && (
          <Typography.Text type="secondary" className="map-search-empty">
            搜不到「{query.trim()}」，试试省份或城市名。
          </Typography.Text>
        )}
      </div>
      <div className="map-viewport">
        <svg
          className="map-canvas"
          data-testid="china-map"
          data-level="china"
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="中国地图：点击省份进入省级地图，拖动平移，滚轮或按钮缩放"
          onPointerDown={viewport.onPointerDown}
          onPointerMove={viewport.onPointerMove}
          onPointerUp={viewport.endDrag}
          onPointerCancel={viewport.endDrag}
          onClick={() => {
            movedRef.current = false;
          }}
        >
          <rect x={-100} y={-100} width={300} height={300} className="map-ground" />
          {PROVINCE_SHAPES.map((shape) => {
            const hovered = hoveredCode === shape.code;
            return (
              <g
                key={shape.code}
                className={`map-province${hovered ? ' hovered' : ''}`}
                data-province-code={shape.code}
                role="button"
                tabIndex={0}
                aria-label={`${shape.name}（省级区域）`}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerEnter={() => setHoveredCode(shape.code)}
                onPointerLeave={() => setHoveredCode((previous) => (previous === shape.code ? null : previous))}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectProvince(shape.code);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectProvince(shape.code);
                  }
                }}
              >
                <title>{shape.name}</title>
                <path className="map-province-shape" d={provinceShapePath(shape)} />
                <text
                  className="map-province-label"
                  x={shape.label.x}
                  y={shape.label.y}
                  textAnchor="middle"
                  style={{ fontSize: `${(shape.points.length <= 4 && shape.code !== '460000' ? 1.8 : 2.4) * scale}px` }}
                >
                  {shape.name}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="map-scope-card" aria-hidden="true">
          <b>中国</b>
          <span>{PROVINCE_SHAPES.length} 个省级区域 · 点击选省</span>
        </div>
        <MapControls
          view={view}
          fullscreen={fullscreen}
          onZoom={viewport.zoomBy}
          onReset={viewport.resetView}
          onToggleFullscreen={() => setFullscreen((previous) => !previous)}
        />
      </div>
      <p className="map-hint">选择省份进入省级地图；也可以直接搜索城市。缩放不会切换地图层级。</p>
    </div>
  );
}