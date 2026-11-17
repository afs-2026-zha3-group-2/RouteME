/** 行程顺序与路线统计：距离、预计时间、逐段说明；与地图 Marker 双向聚焦。 */

import {
  formatDistance,
  formatDuration,
  type RoutePlan,
  type RouteWaypoint,
} from './AmapService';
import { MODE_LABELS } from './WaypointPanel';

type Props = {
  waypoints: RouteWaypoint[];
  route: RoutePlan | null;
  focusId: string | null;
  onFocus: (id: string) => void;
};

export function ItineraryPanel({ waypoints, route, focusId, onFocus }: Props) {
  return (
    <section className="amap-side-card" data-testid="amap-itinerary-panel">
      <header className="amap-side-head">
        <div>
          <b>行程顺序</b>
          <span>{route === null ? '生成路线后显示真实距离与时间' : MODE_LABELS[route.mode]}</span>
        </div>
      </header>

      {route !== null && (
        <div className="amap-route-stats" data-testid="amap-route-stats">
          <div>
            <b>{formatDistance(route.distanceMeters)}</b>
            <span>总距离</span>
          </div>
          <div>
            <b>{formatDuration(route.durationSeconds)}</b>
            <span>预计时间</span>
          </div>
          <div>
            <b>{waypoints.length}</b>
            <span>途经点</span>
          </div>
        </div>
      )}

      <ol className="amap-itinerary">
        {waypoints.map((waypoint, index) => {
          const leg = route?.legs[index];
          return (
            <li key={waypoint.id} className={focusId === waypoint.id ? 'is-focused' : ''}>
              <button type="button" onClick={() => onFocus(waypoint.id)}>
                <span className="amap-itinerary-index">{index + 1}</span>
                <span className="amap-itinerary-text">
                  <b>{waypoint.name}</b>
                  {route !== null && leg !== undefined && (
                    <span>
                      {MODE_LABELS[route.mode]} {formatDistance(leg.distanceMeters)} ·{' '}
                      {formatDuration(leg.durationSeconds)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}