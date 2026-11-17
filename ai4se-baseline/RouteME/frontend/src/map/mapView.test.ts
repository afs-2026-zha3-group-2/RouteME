import { describe, expect, it } from 'vitest';
import {
  MIN_VIEW,
  buildScenery,
  distanceKm,
  formatKm,
  normalizeView,
  panView,
  routePath,
  viewportFor,
  zoomView,
  type Viewport,
} from './mapView';
import { findPlaceByName, projectPlace } from './placeCatalog';

const view: Viewport = { x: 20, y: 20, w: 40, h: 40 };

describe('map viewport', () => {
  it('keeps a viewport inside the map', () => {
    expect(normalizeView({ x: -10, y: 90, w: 40, h: 40 })).toEqual({ x: 0, y: 60, w: 40, h: 40 });
  });

  it('honours the minimum zoom', () => {
    expect(normalizeView({ x: 40, y: 40, w: 1, h: 1 }).w).toBe(MIN_VIEW);
  });

  it('fits points into a padded square', () => {
    const fitted = viewportFor([
      { x: 40, y: 50 },
      { x: 50, y: 54 },
    ]);
    expect(fitted.w).toBe(fitted.h);
    expect(fitted.w).toBeGreaterThanOrEqual(24);
    expect(fitted.x).toBeLessThanOrEqual(40);
    expect(fitted.x + fitted.w).toBeGreaterThanOrEqual(50);
  });

  it('zooms around the given anchor', () => {
    const zoomed = zoomView(view, 0.5, { x: 40, y: 40 });
    expect(zoomed.w).toBe(20);
    expect(zoomed.x + zoomed.w / 2).toBeCloseTo(40);
    expect(zoomed.y + zoomed.h / 2).toBeCloseTo(40);
  });

  it('pans and clamps at the map edge', () => {
    expect(panView(view, 100, 100)).toEqual({ x: 60, y: 60, w: 40, h: 40 });    
  });
});

describe('routePath / distanceKm / buildScenery', () => {
  it('routePath keeps endpoints and degrades to a line for two points', () => {
    const d = routePath([{ x: 10, y: 10 }, { x: 20, y: 20 }]);
    expect(d.startsWith('M 10 10')).toBe(true);
    expect(d.endsWith('20 20')).toBe(true);
    expect(routePath([])).toBe('');
  });

  it('routePath smooths three points with curves', () => {
    const d = routePath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }]);
    expect(d).toContain('C');
    expect(d.endsWith('20 0')).toBe(true);
  });

  it('distanceKm matches the gazetteer scale (Canton Tower → Beijing Road ≈ 5–6 km)', () => {
    const tower = projectPlace(findPlaceByName('广州塔')!);
    const street = projectPlace(findPlaceByName('北京路')!);
    const km = distanceKm(tower, street);
    expect(km).toBeGreaterThan(4);
    expect(km).toBeLessThan(7);
    expect(formatKm(0.4)).toBe('0.4');
    expect(formatKm(5.6)).toBe('6');
  });

  it('buildScenery is deterministic and inside the view', () => {
    const v = { x: 20, y: 20, w: 30, h: 30 };
    const a = buildScenery(v);
    const b = buildScenery(v);
    expect(a).toEqual(b);
    expect(a.length).toBe(4);
    for (const park of a) {
      expect(park.x).toBeGreaterThanOrEqual(v.x);
      expect(park.x + park.w).toBeLessThanOrEqual(v.x + v.w);
    }
  });
});