import { describe, expect, it } from 'vitest';
import {
  MIN_VIEW,
  normalizeView,
  panView,
  viewportFor,
  zoomView,
  type Viewport,
} from './mapView';

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