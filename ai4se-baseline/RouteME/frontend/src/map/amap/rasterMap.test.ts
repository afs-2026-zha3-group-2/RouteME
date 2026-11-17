import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  fitView,
  projectPoint,
  shiftCenter,
  tileUrl,
  unprojectPoint,
  visibleTiles,
} from './rasterMap';

const SHENZHEN: [number, number] = [114.5077, 22.5979];
const SIZE = { width: 800, height: 600 };

describe('raster map projection', () => {
  it('round-trips a coordinate through world pixels', () => {
    const world = projectPoint(SHENZHEN, 13);
    const [lng, lat] = unprojectPoint(world.x, world.y, 13);
    expect(lng).toBeCloseTo(SHENZHEN[0], 6);
    expect(lat).toBeCloseTo(SHENZHEN[1], 6);
  });

  it('doubles the world size per zoom level', () => {
    const atTwelve = projectPoint(SHENZHEN, 12);
    const atThirteen = projectPoint(SHENZHEN, 13);
    expect(atThirteen.x).toBeCloseTo(atTwelve.x * 2, 6);
    expect(atThirteen.y).toBeCloseTo(atTwelve.y * 2, 6);
  });

  it('clamps zoom to the supported range', () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(30)).toBe(MAX_ZOOM);
    expect(clampZoom(12.5)).toBe(12.5);
  });

  it('moves the center opposite to the drag direction', () => {
    // 内容向右拖 100px（dx>0）时，视野中心向西移动（经度变小）。
    const shifted = shiftCenter(SHENZHEN, 13, 100, 0);
    expect(shifted[0]).toBeLessThan(SHENZHEN[0]);
    expect(shifted[1]).toBeCloseTo(SHENZHEN[1], 6);
  });
});

describe('raster map tiles', () => {
  it('builds a four-subdomain AMap raster URL', () => {
    expect(tileUrl(0, 0, 1)).toContain('webst01.is.autonavi.com');
    expect(tileUrl(1, 0, 1)).toContain('webst02.is.autonavi.com');
    expect(tileUrl(3, 0, 1)).toContain('webst04.is.autonavi.com');
    expect(tileUrl(26766, 14275, 15)).toContain('style=7&x=26766&y=14275&z=15');
  });

  it('covers the whole viewport without gaps', () => {
    const tiles = visibleTiles(SHENZHEN, 13, SIZE);
    expect(tiles.length).toBeGreaterThan(0);
    expect(Math.min(...tiles.map((tile) => tile.left))).toBeLessThanOrEqual(0);
    expect(Math.max(...tiles.map((tile) => tile.left + tile.size))).toBeGreaterThanOrEqual(
      SIZE.width,
    );
    expect(Math.min(...tiles.map((tile) => tile.top))).toBeLessThanOrEqual(0);
    expect(Math.max(...tiles.map((tile) => tile.top + tile.size))).toBeGreaterThanOrEqual(
      SIZE.height,
    );
  });

  it('returns no tiles before the container has a size', () => {
    expect(visibleTiles(SHENZHEN, 13, { width: 0, height: 0 })).toEqual([]);
  });
});

describe('raster map fitView', () => {
  it('centers a route and keeps every point inside the padding', () => {
    const points: Array<[number, number]> = [
      [114.5077, 22.5979],
      [114.571, 22.545],
      [114.5654, 22.5481],
    ];
    const view = fitView(points, SIZE, 80, 16);
    expect(view).not.toBeNull();
    if (view === null) {
      return;
    }

    for (const point of points) {
      const world = projectPoint(point, view.zoom);
      const center = projectPoint(view.center, view.zoom);
      const x = world.x - center.x + SIZE.width / 2;
      const y = world.y - center.y + SIZE.height / 2;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(SIZE.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(SIZE.height);
    }
  });

  it('zooms a single point to the given max zoom', () => {
    const view = fitView([SHENZHEN], SIZE, 80, 16);
    expect(view?.zoom).toBe(16);
  });

  it('ignores empty or invalid input', () => {
    expect(fitView([], SIZE)).toBeNull();
    expect(fitView([[Number.NaN, 22]], SIZE)).toBeNull();
  });
});