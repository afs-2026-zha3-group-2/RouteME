import type { KeyboardEvent, MouseEvent } from 'react';
import {
  ISLANDS,
  LAND_PATH,
  PLACES,
  projectPlace,
  type Place,
  type PlaceKind,
} from './placeCatalog';

type Props = {
  selected: string[];
  onPick: (place: Place) => void;
  kinds?: PlaceKind[];
  activePlaceId?: string | null;
};

const KIND_LABEL: Record<PlaceKind, string> = { city: '城市', poi: '地点' };

/**
 * Offline schematic map. Clicking anywhere snaps to the nearest catalog place,
 * so a waypoint always has a searchable name and a coordinate.
 */
export function PlaceMap({ selected, onPick, kinds, activePlaceId }: Props) {
  const places = kinds === undefined ? PLACES : PLACES.filter((place) => kinds.includes(place.kind));
  const selectedPlaces = selected
    .map((name) => places.find((place) => place.name === name))
    .filter((place): place is Place => place !== undefined);

  const pickNearest = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
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
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="广东示意地图，点击地图可以选择最近的城市或地点"
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
        {ISLANDS.map((island, index) => (
          <circle
            key={`island-${index}`}
            className="map-island"
            cx={island.x}
            cy={island.y}
            r={island.r}
          />
        ))}

        <text className="map-sea-label" x="86" y="72" textAnchor="middle">
          南海
        </text>
        <text className="map-sea-label" x="12" y="86" textAnchor="middle">
          北部湾
        </text>

        {places.map((place) => {
          const point = projectPlace(place);
          const isCity = place.kind === 'city';
          const labelAnchor = point.x > 78 ? 'end' : 'start';
          const labelX = point.x > 78 ? point.x - 2.2 : point.x + 2.2;
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
              <circle className="map-pin-hit" cx={point.x} cy={point.y} r={isCity ? 4.4 : 3.6} />
              <circle className="map-pin-dot" cx={point.x} cy={point.y} r={isCity ? 1.5 : 0.9} />
              {isCity && (
                <text className="map-pin-label" x={labelX} y={point.y + 1.1} textAnchor={labelAnchor}>
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
              <circle className="map-selected-halo" cx={point.x} cy={point.y} r={3.6} />
              <circle className="map-selected-dot" cx={point.x} cy={point.y} r={2.5} />
              <text className="map-selected-index" x={point.x} y={point.y + 0.95} textAnchor="middle">
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="map-hint">
        点击地图任何位置会自动吸附到最近的城市/地点；选中的点带编号显示在路线上。
      </p>
    </div>
  );
}