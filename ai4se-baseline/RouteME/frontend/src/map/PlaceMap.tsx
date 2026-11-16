import type { KeyboardEvent, MouseEvent } from 'react';
import {
  ISLANDS,
  LAND_PATH,
  PLACES,
  placesInCity,
  projectPlace,
  type Place,
  type PlaceKind,
} from './placeCatalog';

type Props = {
  selected: string[];
  onPick: (place: Place) => void;
  kinds?: PlaceKind[];
  activePlaceId?: string | null;
  /** Gazetteer city the map is scoped to; undefined shows the whole province. */
  city?: string;
};

const KIND_LABEL: Record<PlaceKind, string> = { city: '城市', poi: '地点' };
type Viewport = { x: number; y: number; w: number; h: number };
const WHOLE: Viewport = { x: 0, y: 0, w: 100, h: 100 };
const MIN_VIEW = 26;
const VIEW_PADDING = 8;

function viewportFor(points: { x: number; y: number }[]): Viewport {
  if (points.length === 0) {
    return WHOLE;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const side =
    Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), MIN_VIEW) +
    VIEW_PADDING * 2;
  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const clamp = (value: number) => Math.min(Math.max(value, 0), 100 - side);
  return { x: clamp(centerX - side / 2), y: clamp(centerY - side / 2), w: side, h: side };
}

/**
 * Offline schematic map. Clicking anywhere snaps to the nearest catalog place,
 * so a waypoint always has a searchable name and a coordinate.
 *
 * With `city` set the map zooms to that city's places; the viewBox keeps a
 * square aspect so a wide container can never stretch the land.
 */
export function PlaceMap({ selected, onPick, kinds, activePlaceId, city }: Props) {
  const scoped = city === undefined ? PLACES : placesInCity(city);
  const places = kinds === undefined ? scoped : scoped.filter((place) => kinds.includes(place.kind));
  const selectedPlaces = selected
    .map((name) => places.find((place) => place.name === name))
    .filter((place): place is Place => place !== undefined);
  const view = city === undefined ? WHOLE : viewportFor(places.map(projectPlace));
  /** Keeps dots and labels at a constant on-screen size when the viewBox zooms. */
  const scale = view.w / 100;
    const anchorPlace = places.find((place) => place.kind === 'city');
    const anchor = anchorPlace === undefined ? undefined : projectPlace(anchorPlace);

  // Greedy label layout: keep the city anchor, then accept a POI label only when
  // it does not overlap an already accepted one.
  const labeledIds = new Set<string>();
  if (city === undefined) {
    places.filter((place) => place.kind === 'city').forEach((place) => labeledIds.add(place.id));
  } else {
    const accepted: { x: number; y: number }[] = [];
        const minGap = view.w * 0.22;
    [...places]
      .sort((left, right) => Number(right.kind === 'city') - Number(left.kind === 'city'))
      .forEach((place) => {
        const point = projectPlace(place);
        if (accepted.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < minGap)) {
          return;
        }
        accepted.push(point);
        labeledIds.add(place.id);
      });
  }

  const pickNearest = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const point = {
      x: view.x + ((event.clientX - rect.left) / rect.width) * view.w,
      y: view.y + ((event.clientY - rect.top) / rect.height) * view.h,
    };
    let best: { place: Place; distance: number } | null = null;
    for (const place of places) {
      const projected = projectPlace(place);
      const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
      if (best === null || distance < best.distance) {
        best = { place, distance };
      }
    }
    if (best !== null) {
      onPick(best.place);
    }
  };

  return (
    <div className="map-shell">
      <svg
        className="map-canvas"
            data-testid="place-map"
            data-city={city ?? 'all'}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={
              city === undefined
                ? '广东示意地图，点击地图可以选择最近的城市或地点'
                : `${city}示意地图，点击地图可以选择最近的候选地点`
            }
            onClick={pickNearest}
          >
        <defs>
          <linearGradient id="map-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-sea-from, #d9eef3)" />
            <stop offset="100%" stopColor="var(--map-sea-to, #bcdde6)" />
          </linearGradient>
          <linearGradient id="map-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--map-land-from, #f3efe2)" />
            <stop offset="100%" stopColor="var(--map-land-to, #e5ddc8)" />
          </linearGradient>
        </defs>

        <rect className="map-sea" x="0" y="0" width="100" height="100" fill="url(#map-sea)" />
        <path className="map-land-shape" d={LAND_PATH} fill="url(#map-land)" />
                <g className="map-grid" aria-hidden="true">
                  {[20, 40, 60, 80].map((at) => (
                    <line key={`gx-${at}`} x1={at} y1="0" x2={at} y2="100" />
                  ))}
                  {[20, 40, 60, 80].map((at) => (
                    <line key={`gy-${at}`} x1="0" y1={at} x2="100" y2={at} />
                  ))}
                </g>
                {city === undefined &&
                  ISLANDS.map((island, index) => (
                    <circle
                      key={`island-${index}`}
                      className="map-island"
                      cx={island.x}
                      cy={island.y}
                      r={island.r}
                    />
                  ))}

                {city === undefined && (
                  <>
                    <text className="map-sea-label" x="86" y="72" textAnchor="middle">
                      南海
                    </text>
                    <text className="map-sea-label" x="12" y="86" textAnchor="middle">
                      北部湾
                    </text>
                  </>
                )}

                {city !== undefined && anchor !== undefined && (
                  <circle
                    className="map-focus-ring"
                    cx={anchor.x}
                    cy={anchor.y}
                    r={Math.max(view.w * 0.16, 6)}
                  />
                )}

        {places.map((place) => {
          const point = projectPlace(place);
          const isCity = place.kind === 'city';
                  const nearRight = point.x > view.x + view.w * 0.72;
                  const labelAnchor = nearRight ? 'end' : 'start';
                  const labelX = nearRight ? point.x - 3 * scale : point.x + 3 * scale;
                  return (
                    <g
                      key={place.id}
                      className={`map-pin ${place.kind}${activePlaceId === place.id ? ' active' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${place.name}（${KIND_LABEL[place.kind]}，${place.city}）`}
                      onClick={(event) => {
                        event.stopPropagation();
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
                      <circle
                        className="map-pin-hit"
                        cx={point.x}
                        cy={point.y}
                        r={4.2 * scale}
                      />
                      <circle
                        className="map-pin-dot"
                        cx={point.x}
                        cy={point.y}
                        r={(isCity ? 1.9 : 1.4) * scale}
                        style={{ strokeWidth: 0.5 * scale }}
                      />
                      {(isCity || city !== undefined) && labeledIds.has(place.id) && (
                        <text
                          className="map-pin-label"
                          x={labelX}
                          y={point.y + 3.4 * scale}
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
            <g key={`selected-${place.id}`} className="map-selected">
                      <circle className="map-selected-halo" cx={point.x} cy={point.y} r={3.6 * scale} />
                      <circle
                        className="map-selected-dot"
                        cx={point.x}
                        cy={point.y}
                        r={2.4 * scale}
                        style={{ strokeWidth: 0.5 * scale }}
                      />
                      <text
                        className="map-selected-index"
                        x={point.x}
                        y={point.y + 0.95 * scale}
                        textAnchor="middle"
                        style={{ fontSize: `${2 * scale}px` }}
                      >
                        {index + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <p className="map-hint">
                {city === undefined
                  ? '点击地图任何位置会自动吸附到最近的城市/地点；选中的点带编号显示在路线上。'
                  : `已按${city}筛选候选点，点击地图或点位即可加入路线。`}
              </p>
    </div>
  );
}