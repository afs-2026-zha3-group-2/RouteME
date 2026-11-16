import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
  } from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import {
  ISLANDS,
  LAND_PATH,
  PLACES,
  placesInCity,
  projectPlace,
  type Place,
  type PlaceKind,
  type Point,
} from './placeCatalog';
import {
  MIN_VIEW,
  clientToViewPoint,
  normalizeView,
  panView,
  viewportFor,
  zoomView,
  type Viewport,
  WHOLE_VIEW,
} from './mapView';

type Props = {
  selected: string[];
  onPick: (place: Place) => void;
  kinds?: PlaceKind[];
  activePlaceId?: string | null;
  /** Gazetteer city the map is scoped to; undefined shows the whole province. */
  city?: string;
  /** Place to centre on after a search result is added. */
  focusPlaceId?: string | null;
};

const KIND_LABEL: Record<PlaceKind, string> = { city: '城市', poi: '地点' };

const DISTRICTS: Record<string, string[]> = {
  珠海: ['香洲', '金湾', '斗门'],
  广州: ['天河', '越秀', '海珠', '荔湾'],
  深圳: ['南山', '福田', '罗湖'],
  佛山: ['禅城', '南海', '顺德'],
  东莞: ['南城', '松山湖', '虎门'],
  中山: ['石岐', '火炬', '南朗'],
  香港: ['九龙', '港岛', '新界'],
  澳门: ['半岛', '氹仔', '路环'],
};

type Street = { id: string; x1: number; y1: number; x2: number; y2: number; major: boolean };
type Callout = { place: Place | null; x: number; y: number };
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  view: Viewport;
  width: number;
  height: number;
};

/** Six readable labels at province scale; the rest stay as hoverable dots. */
type LabelOffset = { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };

const PROVINCE_LABELS: Record<string, LabelOffset> = {
  广州: { dx: 0, dy: -2.8, anchor: 'middle' },
  深圳: { dx: 3.2, dy: 0, anchor: 'start' },
  珠海: { dx: -3.2, dy: 2.8, anchor: 'end' },
  汕头: { dx: 3.2, dy: 0, anchor: 'start' },
  湛江: { dx: 0, dy: 3.2, anchor: 'middle' },
  韶关: { dx: 0, dy: -2.8, anchor: 'middle' },
};

/** Rotate labels around a city cluster so close POIs stay readable. */
const CITY_LABEL_SLOTS: LabelOffset[] = [
  { dx: 2.8, dy: 1.1, anchor: 'start' },
  { dx: -2.8, dy: 1.1, anchor: 'end' },
  { dx: 0, dy: -2.6, anchor: 'middle' },
  { dx: 0, dy: 3.6, anchor: 'middle' },
  { dx: 2.8, dy: -2.2, anchor: 'start' },
  { dx: -2.8, dy: 3.6, anchor: 'end' },
  { dx: 0, dy: 5.4, anchor: 'middle' },
  { dx: 0, dy: -4.4, anchor: 'middle' },
];

const HIGHWAYS: Array<[Point, Point]> = (() => {
  const cities = PLACES.filter((place) => place.kind === 'city');
  const links: Array<[Point, Point]> = [];
  for (const left of cities) {
    for (const right of cities) {
      if (left.id >= right.id) {
        continue;
      }
      const from = projectPlace(left);
      const to = projectPlace(right);
      if (Math.hypot(from.x - to.x, from.y - to.y) <= 14) {
        links.push([from, to]);
      }
    }
  }
  return links;
})();

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildStreets(view: Viewport): Street[] {
  const spacing = view.w < 26 ? 3.6 : view.w < 45 ? 5 : view.w < 70 ? 6.5 : 8;
  const streets: Street[] = [];
  const startX = Math.floor(view.x / spacing) * spacing;
  const startY = Math.floor(view.y / spacing) * spacing;
  let index = 0;
  for (let x = startX; x <= view.x + view.w + spacing; x += spacing) {
    streets.push({
      id: `v-${index}`,
      x1: x,
      y1: view.y,
      x2: x,
      y2: view.y + view.h,
      major: index % 3 === 0,
    });
    index += 1;
  }
  index = 0;
  for (let y = startY; y <= view.y + view.h + spacing; y += spacing) {
    streets.push({
      id: `h-${index}`,
      x1: view.x,
      y1: y,
      x2: view.x + view.w,
      y2: y,
      major: index % 3 === 0,
    });
    index += 1;
  }
  return streets;
}

function MapGlyph({ d }: { d: string }) {
  return (
    <svg className="map-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Offline navigation-style map. Supports drag, wheel/button zoom, fit and fullscreen;
 * every click maps back through the SVG transform, so letterboxed views stay accurate.
 */
export function PlaceMap({ selected, onPick, kinds, activePlaceId, city, focusPlaceId }: Props) {
  const places = useMemo(() => {
    const scoped = city === undefined ? PLACES : placesInCity(city);
    return kinds === undefined ? scoped : scoped.filter((place) => kinds.includes(place.kind));
  }, [city, kinds]);

  const province = city === undefined;
    const visiblePlaces = useMemo(
      () => (province ? places.filter((place) => place.kind === 'city') : places),
      [places, province],
    );

    const selectedPlaces = useMemo(
      () =>
        selected
          .map((name) => places.find((place) => place.name === name))
          .filter((place): place is Place => place !== undefined),
      [places, selected],
    );

  const cityView = useMemo(
    () =>
      city === undefined
        ? WHOLE_VIEW
          : viewportFor(places.map(projectPlace), 6, 10),
    [city, places],
  );

  const [view, setView] = useState<Viewport>(cityView);
  const [fullscreen, setFullscreen] = useState(false);
  const [callout, setCallout] = useState<Callout | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setView(cityView);
    setCallout(null);
  }, [cityView]);

  useEffect(() => {
    if (focusPlaceId === null || focusPlaceId === undefined) {
      return;
    }
    const place = places.find((entry) => entry.id === focusPlaceId);
    if (place === undefined) {
      return;
    }
    const point = projectPlace(place);
    setView(normalizeView({ x: point.x - 12, y: point.y - 12, w: 24, h: 24 }));
  }, [focusPlaceId, places]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullscreen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [fullscreen]);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = clientToViewPoint(svg, event.clientX, event.clientY) ?? undefined;
      setView((previous) => zoomView(previous, event.deltaY > 0 ? 1.12 : 0.89, anchor));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    setView((previous) => zoomView(previous, factor));
    setCallout(null);
  };

  const fitView = () => {
    const points = selectedPlaces.map(projectPlace);
    setView(points.length > 0 ? viewportFor(points, 12, 20) : cityView);
    setCallout(null);
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view,
      width: rect.width,
      height: rect.height,
    };
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId || drag.width === 0 || drag.height === 0) {
      return;
    }
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) > 3) {
      movedRef.current = true;
    }
    setView(
      panView(
        drag.view,
        (-deltaX / drag.width) * drag.view.w,
        (-deltaY / drag.height) * drag.view.h,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const onCanvasClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const svg = svgRef.current;
    const shell = shellRef.current;
    if (svg === null || shell === null) {
      return;
    }
    const point = clientToViewPoint(svg, event.clientX, event.clientY);
    if (point === null) {
      return;
    }
    let best: { place: Place; distance: number } | null = null;
    for (const place of visiblePlaces) {
      const projected = projectPlace(place);
      const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
      if (best === null || distance < best.distance) {
        best = { place, distance };
      }
    }
    const threshold = Math.max(view.w, view.h) * 0.2;
    const rect = shell.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 12, Math.max(12, rect.width - 232));
    const y = clamp(event.clientY - rect.top, 12, Math.max(12, rect.height - 132));
    if (best !== null && best.distance <= threshold) {
      setCallout({ place: best.place, x, y });
    } else {
      setCallout({ place: null, x, y });
    }
  };

  const streets = useMemo(() => buildStreets(view), [view]);
  const scale = view.w / 100;
  const riverY = view.y + view.h * 0.7;
  const riverPath = `M ${view.x - 6} ${riverY} C ${view.x + view.w * 0.22} ${riverY - view.h * 0.09}, ${view.x + view.w * 0.46} ${riverY + view.h * 0.1}, ${view.x + view.w * 0.66} ${riverY - view.h * 0.04} S ${view.x + view.w * 0.9} ${riverY + view.h * 0.08}, ${view.x + view.w + 6} ${riverY}`;
  const districtLabels = city === undefined ? [] : (DISTRICTS[city] ?? []);

  const labeledIds = new Set<string>();
    const labelSlots = new Map<string, number>();
    if (province) {
      visiblePlaces
        .filter((place) => PROVINCE_LABELS[place.name] !== undefined)
        .forEach((place) => labeledIds.add(place.id));
    } else {
      [...visiblePlaces]
        .sort(
          (left, right) =>
            Number(right.kind === 'city') - Number(left.kind === 'city') ||
            projectPlace(left).y - projectPlace(right).y ||
            projectPlace(left).x - projectPlace(right).x,
        )
        .forEach((place, index) => {
          labelSlots.set(place.id, index);
          if (place.kind === 'city') {
            labeledIds.add(place.id);
          }
        });
      }

  const routePoints = selectedPlaces.map(projectPlace);
  const routePath = routePoints.map((point) => `${point.x},${point.y}`).join(' ');
  const scaleKm = Math.max(1, Math.round((view.w / 100) * 900 * 0.06));

  return (
    <div
      className={fullscreen ? 'map-shell is-fullscreen' : 'map-shell'}
      ref={shellRef}
    >
      <div className="map-toolbar">
        <span className="map-scope">
          <b>{city ?? '广东全省'}</b>
          <span>{province ? `${visiblePlaces.length} 个城市` : `${places.length} 个可选地点`}</span>
        </span>
        <Space size={4}>
          <Tooltip title="缩小">
            <Button
              size="small"
              aria-label="缩小地图"
              disabled={view.w >= 100}
              onClick={() => zoomBy(1.25)}
            >
              <MapGlyph d="M5 12h14" />
            </Button>
          </Tooltip>
          <Tooltip title="放大">
            <Button
              size="small"
              aria-label="放大地图"
              disabled={view.w <= MIN_VIEW + 0.01}
              onClick={() => zoomBy(0.8)}
            >
              <MapGlyph d="M12 5v14M5 12h14" />
            </Button>
          </Tooltip>
          <Tooltip title="回到当前范围">
            <Button size="small" aria-label="回到当前范围" onClick={fitView}>
                          <MapGlyph d="M12 4v2M12 18v2M4 12h2M18 12h2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8" />
            </Button>
          </Tooltip>
          <Tooltip title={fullscreen ? '退出全屏' : '全屏查看'}>
            <Button
              size="small"
              aria-label={fullscreen ? '退出全屏' : '全屏查看地图'}
              onClick={() => setFullscreen((previous) => !previous)}
            >
              <MapGlyph
                d={
                  fullscreen
                    ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'
                    : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'
                }
              />
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div className="map-viewport">
        <svg
          className="map-canvas"
          data-testid="place-map"
          data-city={city ?? 'all'}
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={
            city === undefined
              ? '广东导航地图：拖动平移，滚轮或按钮缩放，点击城市或地点加入路线'
              : `${city}导航地图：拖动平移，滚轮或按钮缩放，点击地点加入路线`
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={onCanvasClick}
        >
          <defs>
            <linearGradient id="map-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--map-water-from)" />
              <stop offset="100%" stopColor="var(--map-water-to)" />
            </linearGradient>
            <linearGradient id="map-ground" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--map-land-from)" />
              <stop offset="100%" stopColor="var(--map-land-to)" />
            </linearGradient>
          </defs>

          <rect
            x={view.x - view.w}
            y={view.y - view.h}
            width={view.w * 3}
            height={view.h * 3}
            fill="url(#map-ground)"
          />
          {!province && (
            <path
              className="map-water-band"
              d={riverPath}
              style={{ strokeWidth: view.w * 0.055 }}
            />
          )}
                    {province && (
            <>
              <path className="map-land-shape" d={LAND_PATH} fill="url(#map-ground)" />
              {ISLANDS.map((island, index) => (
                <circle
                  key={`island-${index}`}
                  className="map-island"
                  cx={island.x}
                  cy={island.y}
                  r={island.r}
                />
              ))}
              <text className="map-sea-label" x="86" y="72" textAnchor="middle">南海</text>
              <text className="map-sea-label" x="12" y="86" textAnchor="middle">北部湾</text>
            </>
          )}

          {province && (
                      <g className="map-highways" aria-hidden="true">
                        {HIGHWAYS.map(([from, to], index) => (
                          <line key={`hw-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                        ))}
                      </g>
                    )}

                    {!province && (
                      <>
                        <g className="map-parks" aria-hidden="true">
                          <rect
                            x={view.x + view.w * 0.08}
                            y={view.y + view.h * 0.16}
                            width={view.w * 0.22}
                            height={view.h * 0.16}
                            rx={view.w * 0.03}
                          />
                          <rect
                            x={view.x + view.w * 0.64}
                            y={view.y + view.h * 0.34}
                            width={view.w * 0.2}
                            height={view.h * 0.14}
                            rx={view.w * 0.03}
                          />
                          <rect
                            x={view.x + view.w * 0.3}
                            y={view.y + view.h * 0.76}
                            width={view.w * 0.16}
                            height={view.h * 0.12}
                            rx={view.w * 0.03}
                          />
                        </g>

                        <g className="map-streets" aria-hidden="true">
                          {streets.map((street) => (
                            <line
                              key={street.id}
                              className={street.major ? 'map-street major' : 'map-street'}
                              x1={street.x1}
                              y1={street.y1}
                              x2={street.x2}
                              y2={street.y2}
                              style={{ strokeWidth: view.w * (street.major ? 0.008 : 0.0045) }}
                            />
                          ))}
                          <line
                            className="map-street arterial"
                            x1={view.x}
                            y1={view.y + view.h * 0.24}
                            x2={view.x + view.w}
                            y2={view.y + view.h * 0.86}
                            style={{ strokeWidth: view.w * 0.012 }}
                          />
                        </g>

                        {districtLabels.map((name, index) => (
                          <text
                            key={name}
                            className="map-district"
                            x={view.x + view.w * (0.16 + index * 0.24)}
                            y={view.y + view.h * 0.13}
                            style={{ fontSize: `${2.1 * scale}px` }}
                          >
                            {name}
                          </text>
                        ))}
                      </>
                    )}

          {routePoints.length > 1 && (
            <g className="map-route" aria-hidden="true">
              <polyline
                              className="map-route-casing"
                              points={routePath}
                              style={{ strokeWidth: view.w * 0.018 }}
                            />
                            <polyline
                              className="map-route-line"
                              points={routePath}
                              style={{ strokeWidth: view.w * 0.011 }}
                            />
            </g>
          )}

          {city !== undefined && (
            <g className="map-focus" aria-hidden="true">
              <circle
                className="map-focus-ring"
                cx={view.x + view.w / 2}
                cy={view.y + view.h / 2}
                r={view.w * 0.14}
                                style={{ strokeWidth: view.w * 0.005 }}
                              />
            </g>
          )}

          {visiblePlaces.map((place) => {
            const point = projectPlace(place);
            const isCity = place.kind === 'city';
            const nearRight = point.x > view.x + view.w * 0.72;
                      const slot = labelSlots.get(place.id);
                      const offset = province
                        ? PROVINCE_LABELS[place.name]
                        : slot === undefined
                          ? undefined
                          : CITY_LABEL_SLOTS[slot % CITY_LABEL_SLOTS.length];
                      const labelAnchor = offset?.anchor ?? (nearRight ? 'end' : 'start');
                      const labelX = point.x + (offset?.dx ?? (nearRight ? -3 : 3)) * scale;
                      const labelY = point.y + (offset?.dy ?? 3.4) * scale;
            return (
              <g
                key={place.id}
                className={`map-pin ${place.kind}${activePlaceId === place.id ? ' active' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${place.name}（${KIND_LABEL[place.kind]}，${place.city}）`}
                onPointerDown={(event) => event.stopPropagation()}
                                onPointerEnter={() => setHoveredId(place.id)}
                                onPointerLeave={() => setHoveredId((previous) => (previous === place.id ? null : previous))}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCallout(null);
                                  onPick(place);
                                }}
                onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPick(place);
                  }
                }}
              >
                <title>{`${place.name} · ${KIND_LABEL[place.kind]}`}</title>
                <circle className="map-pin-hit" cx={point.x} cy={point.y} r={2.4 * scale} />
                <circle
                  className="map-pin-dot"
                  cx={point.x}
                  cy={point.y}
                  r={(isCity ? 1.9 : 1.4) * scale}
                  style={{ strokeWidth: 0.5 * scale }}
                />
                {(isCity ||
                  labeledIds.has(place.id) ||
                  hoveredId === place.id ||
                  activePlaceId === place.id ||
                  selected.includes(place.name)) && (
                  <text
                    className="map-pin-label"
                    x={labelX}
                                      y={labelY}
                    textAnchor={labelAnchor}
                    style={{ fontSize: `${2.6 * scale}px` }}
                  >
                    {place.name}
                  </text>
                )}
              </g>
            );
          })}

          {selectedPlaces.map((place, index) => {
            const point = projectPlace(place);
            return (
              <g key={`selected-${place.id}`} className="map-selected" aria-hidden="true">
                <circle className="map-selected-halo" cx={point.x} cy={point.y} r={4.4 * scale} />
                <circle
                  className="map-selected-dot"
                  cx={point.x}
                  cy={point.y}
                  r={2.5 * scale}
                  style={{ strokeWidth: 0.6 * scale }}
                />
                <text
                  className="map-selected-index"
                  x={point.x}
                  y={point.y + 0.95 * scale}
                  textAnchor="middle"
                  style={{ fontSize: `${2.1 * scale}px` }}
                >
                  {index + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {places.length === 0 && (
          <div className="map-empty">
            <Typography.Text type="secondary">这个城市暂时没有离线点位，换一个目的地试试。</Typography.Text>
          </div>
        )}

        {callout !== null && (
          <div
            className="map-callout"
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
            {callout.place === null ? (
              <Typography.Text type="secondary">
                附近没有可选地点，试着放大地图或直接点击蓝色点位。
              </Typography.Text>
            ) : (
              <>
                <span className="map-callout-kind">
                  {KIND_LABEL[callout.place.kind]} · {callout.place.city}
                </span>
                <b className="map-callout-name">{callout.place.name}</b>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                                    if (callout.place !== null) {
                                      onPick(callout.place);
                                    }
                                    setCallout(null);
                                  }}
                                >
                                  加入路线
                                </Button>
              </>
            )}
          </div>
        )}

        <div className="map-legend" aria-hidden="true">
          <span><i className="legend-line" />路线</span>
          <span><i className="legend-stop" />途经点</span>
          <span><i className="legend-park" />公园</span>
          <span><i className="legend-water" />河流</span>
        </div>

        <div className="map-scale" aria-hidden="true">
          <i />
          <span>约 {scaleKm} km</span>
        </div>
      </div>

      <p className="map-hint">
        {city === undefined
          ? '全省视图：拖动平移、滚轮缩放；先选目的地会聚焦到城市，也可以直接点击城市或地点。'
          : `已聚焦${city}：拖动平移、滚轮或按钮缩放，点击点位或地图空白处加入路线。`}
      </p>
    </div>
  );
}