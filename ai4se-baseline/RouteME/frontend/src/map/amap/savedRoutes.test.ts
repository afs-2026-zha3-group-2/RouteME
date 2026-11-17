import { describe, expect, it } from 'vitest';
import { buildSavedRoute } from './savedRoutes';
import type { RoutePlan, RouteWaypoint } from './AmapService';

describe('saved route snapshot', () => {
  it('keeps POI, coordinate, order, mode, date and totals', () => {
    const waypoints: RouteWaypoint[] = [
      { id: 'B0FFH1', name: '广州塔', address: '阅江西路222号', lng: 113.3245, lat: 23.1064 },
      { id: 'B0FFH2', name: '海心沙', address: '临江大道', lng: 113.328, lat: 23.112 },
    ];
    const route: RoutePlan = {
      mode: 'walking',
      distanceMeters: 1200,
      durationSeconds: 900,
      path: [],
      legs: [{ fromId: 'B0FFH1', toId: 'B0FFH2', distanceMeters: 1200, durationSeconds: 900 }],
    };
    const saved = buildSavedRoute(
      waypoints,
      route,
      { start: '2026-11-20', end: '2026-11-22' },
      new Date('2026-11-17T01:00:00Z'),
    );
    expect(saved.stops).toEqual([
      {
        poiId: 'B0FFH1',
        name: '广州塔',
        address: '阅江西路222号',
        lng: 113.3245,
        lat: 23.1064,
        order: 1,
      },
      {
        poiId: 'B0FFH2',
        name: '海心沙',
        address: '临江大道',
        lng: 113.328,
        lat: 23.112,
        order: 2,
      },
    ]);
    expect(saved).toMatchObject({
      id: 'route-1794877200000',
      mode: 'walking',
      distanceMeters: 1200,
      durationSeconds: 900,
      dateRange: { start: '2026-11-20', end: '2026-11-22' },
    });
  });
});