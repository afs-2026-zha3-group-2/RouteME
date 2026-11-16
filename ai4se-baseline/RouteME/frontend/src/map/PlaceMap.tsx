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
import { coverTone } from '../trips/coverTone';
import {
  ISLANDS,
  LAND_PATH,
  PLACES,
  cityProjection,
  nearestPlaces,
  placesInCity,
  projectPlace,
  type Place,
  type PlaceKind,
  type Point,
} from './placeCatalog';
import {
  KM_PER_X,
  MIN_VIEW,
  buildScenery,
  clientToViewPoint,
  normalizeView,
  panView,
  routePath,
  viewportFor,
  zoomView,
  type Viewport,
  WHOLE_VIEW,
} from './mapView';

type Props = {
  selected: string[];
  onPick?: (place: Place) => void;
  kinds?: PlaceKind[];
  activePlaceId?: string | null;
  /** Gazetteer city the map is scoped to; undefined shows the whole province. */
  city?: string;
  /** Place to centre on after a search result is added or a stop is clicked. */
  focusPlaceId?: string | null;
  /** Detail-page mode: place cards carry no add actions. */
  readOnly?: boolean;
  /** Province overview city click (focus only, never writes a stop). */
  onCityFocus?: (city: string) => void;
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
type Callout = { place: Place | null; candidates: Place[]; x: number; y: number };
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  view: Viewport;
  width: number;
  height: number;
};

type LabelOffset = { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };

const PROVINCE_LABELS: Record<string, LabelOffset> = {
  广州: { dx: 0, dy: -2.8, anchor: 'middle' },
  深圳: { dx: 3.2, dy: 0, anchor: 'start' },
  珠海: { dx: -3.2, dy: 2.8, anchor: 'end' },
  汕头: { dx: 3.2, dy: 0, anchor: 'start' },
  湛江: { dx: 0, dy: 3.2, anchor: 'middle' },
  韶关: { dx: 0, dy: -2.8, anchor: 'middle' },
};

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

/** 水滴 pin 轮廓（单位坐标，锚点在原点）。 */
const PIN_PATH =
  'M0,0 C-1.5,-2 -2.2,-3.2 -2.2,-4.5 A2.2,2.2 0 1,1 2.2,-4.5 C2.2,-3.2 1.5,-2 0,0 Z';

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
    streets.push({ id: `v-${index}`, x1: x, y1: view.y, x2: x, y2: view.y + view.h, major: index % 3 === 0 });
    index += 1;
  }
  index = 0;
  for (let y = startY; y <= view.y + view.h + spacing; y += spacing) {
    streets.push({ id: `h-${index}`, x1: view.x, y1: y, x2: view.x + view.w, y2: y, major: index % 3 === 0 });
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
 * Offline navigation-style map (方案1 SVG). Drag / wheel / button zoom / fullscreen;
 * every click yields a visible place card or candidate popover; province overview
 * city clicks only focus, never write stops.
 */
export function PlaceMap({
  selected,
  onPick,
  kinds,
  activePlaceId,
  city,
  focusPlaceId,
  readOnly = false,
  onCityFocus,
}: Props) {
  const [focusedCity, setFocusedCity] = useState<string | null>(null);
  const scopedCity = city ?? focusedCity ?? undefined;
  const province = scopedCity === undefined;

  const places = useMemo(() => {
    const scoped = scopedCity === undefined ? PLACES : placesInCity(scopedCity);
    return kinds === undefined ? scoped : scoped.filter((place) => kinds.includes(place.kind));
  }, [scopedCity, kinds]);

  // 城市视图用局部投影展开点位；全省视图沿用省级投影。
  const projection = useMemo(
    () => (scopedCity === undefined ? null : cityProjection(scopedCity)),
    [scopedCity],
  );
  const project = projection?.project ?? projectPlace;

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
      scopedCity === undefined
        ? WHOLE_VIEW
        : viewportFor(places.map(project), 6, 10),
    [scopedCity, places, project],
  );

  const [view, setView] = useState<Viewport>(cityView);
  const [fullscreen, setFullscreen] = useState(false);
  const [callout, setCallout] = useState<Callout | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);

  // 只有外部 city prop 变化才重置内部聚焦；cityView 会随聚焦本身变化，
  // 若一并作为重置依赖会把刚设置的城市聚焦立刻撤销。
  useEffect(() => {
    setFocusedCity(null);
  }, [city]);

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
    const point = project(place);
    setView(normalizeView({ x: point.x - 12, y: point.y - 12, w: 24, h: 24 }));
  }, [focusPlaceId, places, project]);

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
    const points = selectedPlaces.map(project);
    setView(points.length > 0 ? viewportFor(points, 12, 20) : cityView);
    setCallout(null);
  };

  const focusCity = (name: string) => {
    setFocusedCity(name);
    setView(viewportFor(placesInCity(name).map(cityProjection(name).project), 6, 10));
    setCallout(null);
    onCityFocus?.(name);
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
      panView(drag.view, (-deltaX / drag.width) * drag.view.w, (-deltaY / drag.height) * drag.view.h),
    );
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const calloutPosition = (event: ReactMouseEvent) => {
    const shell = shellRef.current;
    if (shell === null) {
      return { x: 12, y: 12 };
    }
    const rect = shell.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 12, Math.max(12, rect.width - 248)),
      y: clamp(event.clientY - rect.top, 12, Math.max(12, rect.height - 190)),
    };
  };

  const onCanvasClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const svg = svgRef.current;
    if (svg === null) {
      return;
    }
    const point = clientToViewPoint(svg, event.clientX, event.clientY);
    if (point === null) {
      return;
    }
    const { x, y } = calloutPosition(event);
    const candidates = nearestPlaces(point, 3, visiblePlaces, project).map((entry) => entry.place);
    setCallout({ place: null, candidates, x, y });
  };

  const onPinClick = (place: Place, event: ReactMouseEvent) => {
    event.stopPropagation();
    if (province && place.kind === 'city') {
      focusCity(place.name);
      return;
    }
    const { x, y } = calloutPosition(event);
    setCallout({ place, candidates: [], x, y });
  };

  const pick = (place: Place) => {
    onPick?.(place);
    setCallout(null);
  };

  const streets = useMemo(() => buildStreets(view), [view]);
  const parks = useMemo(() => (province ? [] : buildScenery(view)), [view, province]);
  const scale = view.w / 100;
  const riverY = view.y + view.h * 0.7;
  const riverPath = `M ${view.x - 6} ${riverY} C ${view.x + view.w * 0.22} ${riverY - view.h * 0.09}, ${view.x + view.w * 0.46} ${riverY + view.h * 0.1}, ${view.x + view.w * 0.66} ${riverY - view.h * 0.04} S ${view.x + view.w * 0.9} ${riverY + view.h * 0.08}, ${view.x + view.w + 6} ${riverY}`;
  const districtLabels = scopedCity === undefined ? [] : (DISTRICTS[scopedCity] ?? []);
  const routeD = routePath(selectedPlaces.map(project));
  const scaleKm = Math.max(1, Math.round(view.w * (projection?.kmPerX ?? KM_PER_X)));

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
          project(left).y - project(right).y ||
          project(left).x - project(right).x,
      )
      .forEach((place, index) => {
        labelSlots.set(place.id, index);
        // 城市视图点位已展开，常显地名标签更接近导航地图。
        labeledIds.add(place.id);
      });
  }

  return (
    <div className={fullscreen ? 'map-shell is-fullscreen' : 'map-shell'} ref={shellRef}>
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
            scopedCity === undefined
              ? '广东导航地图：拖动平移，滚轮或按钮缩放，点击城市聚焦'
              : `${scopedCity}导航地图：拖动平移，滚轮或按钮缩放，点击地点查看或加入路线`
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

          {province && (
            <>
              <path className="map-land-shape" d={LAND_PATH} fill="url(#map-ground)" />
              {ISLANDS.map((island, index) => (
                <circle key={`island-${index}`} className="map-island" cx={island.x} cy={island.y} r={island.r} />
              ))}
              <text className="map-sea-label" x="86" y="72" textAnchor="middle">南海</text>
              <text className="map-sea-label" x="12" y="86" textAnchor="middle">北部湾</text>
              <g className="map-highways" aria-hidden="true">
                {HIGHWAYS.map(([from, to], index) => (
                  <line key={`hw-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                ))}
              </g>
            </>
          )}

          {!province && (
            <>
              <g className="map-parks" aria-hidden="true">
                {parks.map((park, index) => (
                  <g key={`park-${index}`}>
                    <rect x={park.x} y={park.y} width={park.w} height={park.h} rx={view.w * 0.03} />
                    {park.trees.map((tree, treeIndex) => (
                      <g key={`tree-${treeIndex}`} className="map-tree">
                        <circle cx={tree.x} cy={tree.y - 0.5 * scale} r={0.55 * scale} />
                        <line
                          x1={tree.x}
                          y1={tree.y}
                          x2={tree.x}
                          y2={tree.y + 0.5 * scale}
                          style={{ strokeWidth: 0.18 * scale }}
                        />
                      </g>
                    ))}
                  </g>
                ))}
              </g>

              <path className="map-water-band" d={riverPath} style={{ strokeWidth: view.w * 0.06 }} />
              <path className="map-water-band inner" d={riverPath} style={{ strokeWidth: view.w * 0.028 }} />

              <g className="map-streets" aria-hidden="true">
                {streets.map((street) => (
                  <g key={street.id}>
                    {street.major && (
                      <line
                        className="map-street casing"
                        x1={street.x1}
                        y1={street.y1}
                        x2={street.x2}
                        y2={street.y2}
                        style={{ strokeWidth: view.w * 0.011 }}
                      />
                    )}
                    <line
                      className={street.major ? 'map-street major' : 'map-street'}
                      x1={street.x1}
                      y1={street.y1}
                      x2={street.x2}
                      y2={street.y2}
                      style={{ strokeWidth: view.w * (street.major ? 0.008 : 0.0045) }}
                    />
                  </g>
                ))}
                <line
                  className="map-street casing"
                  x1={view.x}
                  y1={view.y + view.h * 0.24}
                  x2={view.x + view.w}
                  y2={view.y + view.h * 0.86}
                  style={{ strokeWidth: view.w * 0.016 }}
                />
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

          {selectedPlaces.length > 1 && (
            <g className="map-route" aria-hidden="true">
              <path className="map-route-casing" d={routeD} style={{ strokeWidth: view.w * 0.02 }} />
              <path className="map-route-line" d={routeD} style={{ strokeWidth: view.w * 0.011 }} />
            </g>
          )}

          {visiblePlaces.map((place) => {
            const point = project(place);
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
            const selectedIndex = selected.indexOf(place.name);
            const isSelected = selectedIndex >= 0;
            return (
              <g
                key={place.id}
                className={`map-pin ${place.kind}${activePlaceId === place.id ? ' active' : ''}${isSelected ? ' selected' : ''}`}
                data-place-id={place.id}
                role="button"
                tabIndex={0}
                aria-label={`${place.name}（${KIND_LABEL[place.kind]}，${place.city}）`}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerEnter={() => setHoveredId(place.id)}
                onPointerLeave={() => setHoveredId((previous) => (previous === place.id ? null : previous))}
                onClick={(event) => onPinClick(place, event)}
                onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (province && isCity) {
                      focusCity(place.name);
                    } else {
                      setCallout({ place, candidates: [], x: 12, y: 12 });
                    }
                  }
                }}
              >
                <title>{`${place.name} · ${KIND_LABEL[place.kind]}`}</title>
                <circle className="map-pin-hit" cx={point.x} cy={point.y} r={2.4 * scale} />
                {isSelected ? (
                  <g transform={`translate(${point.x} ${point.y}) scale(${scale})`}>
                    <circle className="map-selected-anchor" cx={0} cy={0} r={0.8} />
                    <path className="map-pin-teardrop" d={PIN_PATH} />
                    <text className="map-selected-index" x={0} y={-3.6} textAnchor="middle">
                      {selectedIndex + 1}
                    </text>
                  </g>
                ) : (
                  <circle
                    className="map-pin-dot"
                    cx={point.x}
                    cy={point.y}
                    r={(isCity ? 1.9 : 1.4) * scale}
                    style={{ strokeWidth: 0.5 * scale }}
                  />
                )}
                {(isCity ||
                  labeledIds.has(place.id) ||
                  hoveredId === place.id ||
                  activePlaceId === place.id ||
                  isSelected) && (
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
        </svg>

        {places.length === 0 && (
          <div className="map-empty">
            <Typography.Text type="secondary">这个城市暂时没有离线点位，换一个目的地试试。</Typography.Text>
          </div>
        )}

        <div className="map-scope-card" aria-hidden="true">
          <b>{scopedCity ?? '广东全省'}</b>
          <span>{province ? `${visiblePlaces.length} 个城市 · 点击聚焦` : `${places.length} 个可选地点`}</span>
        </div>

        <div className="map-controls">
          <Space direction="vertical" size={4}>
            <Tooltip title="放大" placement="left">
              <Button size="small" aria-label="放大地图" disabled={view.w <= MIN_VIEW + 0.01} onClick={() => zoomBy(0.8)}>
                <MapGlyph d="M12 5v14M5 12h14" />
              </Button>
            </Tooltip>
            <Tooltip title="缩小" placement="left">
              <Button size="small" aria-label="缩小地图" disabled={view.w >= 100} onClick={() => zoomBy(1.25)}>
                <MapGlyph d="M5 12h14" />
              </Button>
            </Tooltip>
            <Tooltip title="全屏查看" placement="left">
              <Button
                size="small"
                aria-label={fullscreen ? '退出全屏' : '全屏查看地图'}
                onClick={() => setFullscreen((previous) => !previous)}
              >
                <MapGlyph
                  d={fullscreen ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'}
                />
              </Button>
            </Tooltip>
            <Tooltip title="回到当前范围" placement="left">
              <Button size="small" aria-label="回到当前范围" onClick={fitView}>
                <MapGlyph d="M12 4v2M12 18v2M4 12h2M18 12h2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8" />
              </Button>
            </Tooltip>
          </Space>
        </div>

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
            {callout.place !== null ? (
              <>
                <div className={`map-callout-cover cover-${coverTone(callout.place.city)}`} aria-hidden="true">
                  <MapGlyph d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11zM12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5" />
                </div>
                <span className="map-callout-kind">
                  {KIND_LABEL[callout.place.kind]} · {callout.place.city}
                </span>
                <b className="map-callout-name">{callout.place.name}</b>
                {!readOnly && onPick !== undefined && (
                  <Button type="primary" size="small" onClick={() => pick(callout.place as Place)}>
                    加入路线
                  </Button>
                )}
              </>
            ) : callout.candidates.length === 0 ? (
              <Typography.Text type="secondary">附近没有可选地点，试着放大地图或直接点击点位。</Typography.Text>
            ) : (
              <>
                <span className="map-callout-kind">附近候选</span>
                <ul className="map-callout-list">
                  {callout.candidates.map((candidate) => (
                    <li key={candidate.id}>
                      <span className="map-callout-candidate-name">{candidate.name}</span>
                      {province ? (
                        <Button size="small" onClick={() => focusCity(candidate.name)}>
                          聚焦
                        </Button>
                      ) : (
                        !readOnly &&
                        onPick !== undefined && (
                          <Button size="small" type="primary" ghost onClick={() => pick(candidate)}>
                            加入路线
                          </Button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="map-legend" aria-hidden="true">
          <span><i className="legend-line" />我的路线</span>
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

      <p className="map-hint">
        {scopedCity === undefined
          ? '全省视图：拖动平移、滚轮缩放；点击城市聚焦，也可以先选目的地。'
          : readOnly
            ? `已聚焦${scopedCity}：拖动平移、滚轮或按钮缩放，点击编号途经点或列表项查看地点。`
            : `已聚焦${scopedCity}：拖动平移、滚轮或按钮缩放，点击点位或空白处加入路线。`}
      </p>
    </div>
  );
}