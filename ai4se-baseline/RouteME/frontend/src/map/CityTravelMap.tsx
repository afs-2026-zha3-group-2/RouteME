/**
 * Level 3 城市旅行地图（refine-trip-map R2 / design D15）。
 *
 * 组合组件（非 monolithic）：六个独立 SVG Layer＋控制条＋面包屑＋
 * POI 信息卡/候选浮层＋路线生成/统计卡/行程列表/同行者面板插槽。
 * 城市重数据经 MapProvider 按城懒加载；未覆盖城市渲染统一 fallback
 * 「该城市详细旅行地图正在完善」，不白屏不报错，面包屑仍可回层。
 */

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Button, Skeleton, Typography } from 'antd';
import { ItineraryList } from './ItineraryList';
import { MapBreadcrumbs } from './MapBreadcrumbs';
import { MapControls } from './MapControls';
import { RouteStatsCard } from './RouteStatsCard';
import { TravelerPanel } from './TravelerPanel';
import { ParkLayer, PoiLayer, RoadLayer, RouteLayer, TravelerLayer, WaterLayer } from './layers';
import { useMapViewport } from './useMapViewport';
import { estimateRoute } from './routeEstimate';
import { matchTravelers, topMatch } from './travelerMatch';
import { offlineSvgProvider } from './provider';
import { cityIndexByCode } from './data/index';
import type { CityMapData, Poi } from './data/types';
import { clientToViewPoint } from './mapView';

type Props = {
  cityCode: string;
  /** 面包屑城市名（父级用区划字典解析，含「市」）。 */
  cityName: string;
  /** 面包屑省级全名（广东省 / 北京市）。 */
  provinceName: string;
  /** 已选景点 id（有序）。 */
  selected: string[];
  onTogglePoi?: (poi: Poi) => void;
  readOnly?: boolean;
  routeGenerated?: boolean;
  onGenerate?: () => void;
  focusPoiId?: string | null;
  onFocusPoi?: (poi: Poi) => void;
  onNavigateChina: () => void;
  onNavigateProvince: () => void;
  onViewProfile?: (userId: number) => void;
  onInvite?: (tripId: number) => void;
};

type Callout = { poi: Poi | null; candidates: Poi[]; x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function CityTravelMap({
  cityCode,
  cityName,
  provinceName,
  selected,
  onTogglePoi,
  readOnly = false,
  routeGenerated = false,
  onGenerate,
  focusPoiId,
  onFocusPoi,
  onNavigateChina,
  onNavigateProvince,
  onViewProfile,
  onInvite,
}: Props) {
  const city = cityIndexByCode(cityCode);
  const pois = useMemo(() => city?.pois ?? [], [city]);
  const [data, setData] = useState<CityMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [callout, setCallout] = useState<Callout | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const viewport = useMapViewport();
  const { view, svgRef, fullscreen, setFullscreen, movedRef } = viewport;

  // 按城懒加载重数据；换城重置浮层/面板，避免跨城残留。
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    setCallout(null);
    setPanelOpen(false);
    offlineSvgProvider
      .loadCity(cityCode)
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cityCode]);

  useEffect(() => {
    if (focusPoiId === null || focusPoiId === undefined) {
      return;
    }
    const poi = pois.find((entry) => entry.id === focusPoiId);
    if (poi !== undefined) {
      viewport.focusPoint(poi, 26);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoiId, pois]);

  const selectedPois = useMemo(
    () =>
      selected
        .map((id) => pois.find((poi) => poi.id === id))
        .filter((poi): poi is Poi => poi !== undefined),
    [selected, pois],
  );

  const matches = useMemo(
    () => (routeGenerated ? matchTravelers(selected, data?.travelers ?? []) : []),
    [routeGenerated, selected, data],
  );
  const bubble = topMatch(matches);
  const estimate = useMemo(
    () => estimateRoute(selectedPois, city?.kmPerX ?? 0.3, city?.kmPerY ?? 0.28),
    [selectedPois, city],
  );

  const scale = view.w / 100;
  const scaleKm = Math.max(1, Math.round(view.w * (city?.kmPerX ?? 0.3)));

  const calloutPosition = (event?: ReactMouseEvent) => {
    const shell = shellRef.current;
    if (shell === null || event === undefined) {
      return { x: 12, y: 12 };
    }
    const rect = shell.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 12, Math.max(12, rect.width - 248)),
      y: clamp(event.clientY - rect.top, 12, Math.max(12, rect.height - 190)),
    };
  };

  const openPoiCallout = (poi: Poi, event?: ReactMouseEvent) => {
    const { x, y } = calloutPosition(event);
    setCallout({ poi, candidates: [], x, y });
  };

  const onCanvasClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const svg = svgRef.current;
    if (svg === null || pois.length === 0) {
      return;
    }
    const point = clientToViewPoint(svg, event.clientX, event.clientY);
    if (point === null) {
      return;
    }
    const candidates = [...pois]
      .map((poi) => ({ poi, distance: Math.hypot(poi.x - point.x, poi.y - point.y) }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 3)
      .map((entry) => entry.poi);
    const { x, y } = calloutPosition(event);
    setCallout({ poi: null, candidates, x, y });
  };

  const focusPoi = (poi: Poi) => {
    viewport.focusPoint(poi, 26);
    onFocusPoi?.(poi);
  };

  const toggleFromCallout = (poi: Poi) => {
    onTogglePoi?.(poi);
    setCallout(null);
  };

  const breadcrumbs = (
    <MapBreadcrumbs
      items={[
        { label: '中国', onClick: onNavigateChina },
        { label: provinceName, onClick: onNavigateProvince },
        { label: cityName },
      ]}
    />
  );

  if (loading) {
    return (
      <div className="map-shell" data-testid="city-map" data-level="city" data-city={cityCode}>
        {breadcrumbs}
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="map-shell" data-testid="city-map" data-level="city" data-city={cityCode}>
        {breadcrumbs}
        <div className="map-fallback" role="status">
          <b>{cityName}</b>
          <Typography.Text type="secondary">该城市详细旅行地图正在完善</Typography.Text>
          <Typography.Text type="secondary" className="map-fallback-hint">
            可先返回省级地图选择其他城市，或直接发布行程寻找同行者。
          </Typography.Text>
        </div>
      </div>
    );
  }

  const routePoints = selectedPois.map((poi) => ({ x: poi.x, y: poi.y }));
  const bubbleAnchor =
    routePoints.length > 0
      ? {
          x: clamp(routePoints.reduce((sum, point) => sum + point.x, 0) / routePoints.length, 16, 84),
          y: clamp(routePoints.reduce((sum, point) => sum + point.y, 0) / routePoints.length - 10, 8, 88),
        }
      : { x: 50, y: 12 };

  return (
    <div className={fullscreen ? 'map-shell is-fullscreen' : 'map-shell'} ref={shellRef}>
      {breadcrumbs}
      <div className="city-map-layout">
        <div className="map-viewport">
          <svg
            className="map-canvas"
            data-testid="city-map"
            data-level="city"
            data-city={cityCode}
            ref={svgRef}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={`${cityName}城市旅行地图：点击景点加入或移除路线，拖动平移，滚轮或按钮缩放`}
            onPointerDown={viewport.onPointerDown}
            onPointerMove={viewport.onPointerMove}
            onPointerUp={viewport.endDrag}
            onPointerCancel={viewport.endDrag}
            onClick={onCanvasClick}
          >
            <rect x={-100} y={-100} width={300} height={300} className="map-ground" />
            <RoadLayer roads={data.layers.roads} scale={scale} />
            <WaterLayer water={data.layers.water} scale={scale} />
            <ParkLayer parks={data.layers.parks} districts={data.layers.districts} scale={scale} />
            {routeGenerated && (
              <RouteLayer
                points={routePoints}
                scale={scale}
                onFocusIndex={(index) => {
                  const poi = selectedPois[index];
                  if (poi !== undefined) {
                    focusPoi(poi);
                  }
                }}
              />
            )}
            <PoiLayer
              pois={pois}
              selected={selected}
              scale={scale}
              activePoiId={focusPoiId}
              onTogglePoi={openPoiCallout}
              onFocusPoi={onFocusPoi}
            />
            {routeGenerated && bubble !== null && (
              <TravelerLayer
                anchor={bubbleAnchor}
                scale={scale}
                topPercent={bubble.percent}
                count={bubble.count}
                onOpen={() => setPanelOpen(true)}
              />
            )}
          </svg>

          <div className="map-scope-card" aria-hidden="true">
            <b>{cityName}</b>
            <span>{pois.length} 个景点 · 已选 {selectedPois.length}</span>
          </div>

          <MapControls
            view={view}
            fullscreen={fullscreen}
            onZoom={viewport.zoomBy}
            onReset={viewport.resetView}
            onToggleFullscreen={() => setFullscreen((previous) => !previous)}
          />

          {callout !== null && (
            <div
              className="map-callout"
              data-testid="map-callout"
              style={{ left: callout.x, top: callout.y }}
              role="dialog"
              aria-label="地图选点"
            >
              <button
                type="button"
                className="map-callout-close"
                aria-label="关闭地图选点"
                onClick={() => setCallout(null)}
              >
                ×
              </button>
              {callout.poi !== null ? (
                <>
                  <span className="map-callout-kind">景点 · {cityName}</span>
                  <b className="map-callout-name">{callout.poi.name}</b>
                  {callout.poi.desc !== undefined && (
                    <Typography.Text type="secondary" className="map-callout-desc">
                      {callout.poi.desc}
                    </Typography.Text>
                  )}
                  {!readOnly && onTogglePoi !== undefined && (
                    <Button
                      type="primary"
                      size="small"
                      danger={selected.includes(callout.poi.id)}
                      onClick={() => toggleFromCallout(callout.poi as Poi)}
                    >
                      {selected.includes(callout.poi.id) ? '移除路线' : '加入路线'}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <span className="map-callout-kind">附近候选</span>
                  <ul className="map-callout-list">
                    {callout.candidates.map((candidate) => (
                      <li key={candidate.id}>
                        <span className="map-callout-candidate-name">{candidate.name}</span>
                        {!readOnly && onTogglePoi !== undefined && (
                          <Button size="small" type="primary" ghost onClick={() => toggleFromCallout(candidate)}>
                            {selected.includes(candidate.id) ? '移除路线' : '加入路线'}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="map-legend" aria-hidden="true">
            <span><i className="legend-line" />旅行路线</span>
            <span><i className="legend-stop" />编号途经点</span>
            <span><i className="legend-poi" />景点</span>
            <span><i className="legend-park" />公园/绿地</span>
            <span><i className="legend-water" />河流</span>
            <span><i className="legend-road" />道路</span>
          </div>

          <div className="map-scale" aria-hidden="true">
            <i />
            <span>约 {scaleKm} km</span>
          </div>
        </div>

        <aside className="city-map-side">
          {!readOnly && onGenerate !== undefined && (
            <div className="route-actions">
              <Button
                type="primary"
                block
                data-testid="route-generate"
                disabled={selectedPois.length < 2}
                onClick={onGenerate}
              >
                {routeGenerated ? '路线已生成 · 重新生成' : '生成旅行路线'}
              </Button>
              {selectedPois.length < 2 && (
                <Typography.Text type="secondary" className="route-actions-hint">
                  至少选择两个景点后才能生成路线。
                </Typography.Text>
              )}
            </div>
          )}
          {routeGenerated && selectedPois.length >= 2 && (
            <RouteStatsCard
              count={selectedPois.length}
              estimate={estimate}
              order={selectedPois.map((poi) => poi.name)}
            />
          )}
          <ItineraryList
            pois={selectedPois}
            focusPoiId={focusPoiId}
            readOnly={readOnly}
            onFocusPoi={focusPoi}
            onRemovePoi={onTogglePoi}
          />
          {routeGenerated && bubble !== null && (
            <Button block data-testid="traveler-open" onClick={() => setPanelOpen(true)}>
              查看同行者（{bubble.count} 位 · 最高 {bubble.percent}% 同路）
            </Button>
          )}
        </aside>
      </div>

      <p className="map-hint">
        {readOnly
          ? '只读路线地图：点击编号途经点或列表项查看地点；缩放不会切换地图层级。'
          : '点击景点加入/移除路线，生成路线后可发现同路旅行者；面包屑可逐级返回。'}
      </p>

      <TravelerPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        matches={matches}
        poiName={(poiId) => pois.find((poi) => poi.id === poiId)?.name ?? poiId}
        onViewProfile={(userId) => {
          setPanelOpen(false);
          onViewProfile?.(userId);
        }}
        onInvite={(tripId) => {
          setPanelOpen(false);
          onInvite?.(tripId);
        }}
      />
    </div>
  );
}