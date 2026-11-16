import type { Point } from './placeCatalog';

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