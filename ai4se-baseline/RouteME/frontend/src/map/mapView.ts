import type { Point } from './placeCatalog';
import { MAP_BOUNDS } from './placeCatalog';

export type Viewport = { x: number; y: number; w: number; h: number };

export const WHOLE_VIEW: Viewport = { x: 0, y: 0, w: 100, h: 100 };
export const MIN_VIEW = 12;
export const MAX_VIEW = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Keep a viewport inside the 0..100 map and within the zoom limits. */
export function normalizeView(view: Viewport): Viewport {
  const w = clamp(view.w, MIN_VIEW, MAX_VIEW);
  const h = clamp(view.h, MIN_VIEW, MAX_VIEW);
  return {
    x: clamp(view.x, 0, 100 - w),
    y: clamp(view.y, 0, 100 - h),
    w,
    h,
  };
}

/** Square viewport that fits the points with padding; falls back to the whole map. */
export function viewportFor(points: Point[], padding = 8, minSide = 24): Viewport {
  if (points.length === 0) {
    return WHOLE_VIEW;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const side =
    Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
      minSide,
    ) +
    padding * 2;
  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
  return normalizeView({
    x: centerX - side / 2,
    y: centerY - side / 2,
    w: side,
    h: side,
  });
}

/** Zoom around an anchor in view coordinates (defaults to the viewport centre). */
export function zoomView(view: Viewport, factor: number, anchor?: Point): Viewport {
  const w = clamp(view.w * factor, MIN_VIEW, MAX_VIEW);
  const h = clamp(view.h * factor, MIN_VIEW, MAX_VIEW);
  const anchorX = anchor?.x ?? view.x + view.w / 2;
  const anchorY = anchor?.y ?? view.y + view.h / 2;
  const ratioX = (anchorX - view.x) / view.w;
  const ratioY = (anchorY - view.y) / view.h;
  return normalizeView({
    x: anchorX - w * ratioX,
    y: anchorY - h * ratioY,
    w,
    h,
  });
}

/** Move the viewport by a delta expressed in view units. */
export function panView(view: Viewport, dx: number, dy: number): Viewport {
  return normalizeView({ ...view, x: view.x + dx, y: view.y + dy });
}

/** Map a browser client point into the SVG viewBox, accounting for letterboxing. */
export function clientToViewPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Point | null {
  const matrix = svg.getScreenCTM();
  if (matrix === null) {
    return null;
  }
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const mapped = point.matrixTransform(matrix.inverse());
  return { x: mapped.x, y: mapped.y };
}

/** 每 viewBox 单位对应的公里数：北纬 23° 每经度≈102.5km、每纬度≈111km。 */
export const KM_PER_X = ((MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng) * 102.5) / 100;
export const KM_PER_Y = ((MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat) * 111) / 100;

/** 两点间直线距离估算（公里），离线无路径规划，展示标「约」。 */
export function distanceKm(a: Point, b: Point): number {
  return Math.hypot((a.x - b.x) * KM_PER_X, (a.y - b.y) * KM_PER_Y);
}

export function formatKm(km: number): string {
  return km >= 1 ? String(Math.round(km)) : km.toFixed(1);
}

/** Catmull-Rom → 三次贝塞尔平滑路线；共线点退化为直线。 */
export function routePath(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export type Park = { x: number; y: number; w: number; h: number; trees: Point[] };

/** 确定性公园绿地布局：随视口平移缩放，纯函数可单测。 */
export function buildScenery(view: Viewport): Park[] {
  const slots = [
    { fx: 0.08, fy: 0.14, fw: 0.24, fh: 0.18 },
    { fx: 0.62, fy: 0.3, fw: 0.22, fh: 0.16 },
    { fx: 0.28, fy: 0.72, fw: 0.18, fh: 0.14 },
    { fx: 0.74, fy: 0.78, fw: 0.16, fh: 0.12 },
  ];
  return slots.map((slot, index) => {
    const x = view.x + view.w * slot.fx;
    const y = view.y + view.h * slot.fy;
    const w = view.w * slot.fw;
    const h = view.h * slot.fh;
    const trees: Point[] = [0.25, 0.55, 0.8].map((tx, treeIndex) => ({
      x: x + w * tx,
      y: y + h * (treeIndex % 2 === 0 ? 0.4 : 0.65),
    }));
    return { x, y, w, h, trees: index % 2 === 0 ? trees : trees.slice(0, 2) };
  });
}