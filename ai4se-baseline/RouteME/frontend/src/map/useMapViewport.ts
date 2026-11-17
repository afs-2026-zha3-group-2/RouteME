/**
 * 地图视口交互 hook（refine-trip-map R2 / design D15）。
 *
 * 从旧 PlaceMap 抽出拖拽/滚轮/按钮缩放/全屏/Reset 的通用逻辑，供
 * ChinaMap / ProvinceMap / CityTravelMap 共用。Zoom 只改当前 viewBox，
 * MUST NOT 触发层级切换（换层走路由，见 MapExplorerPage）。
 */

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import {
  MIN_VIEW,
  clientToViewPoint,
  normalizeView,
  panView,
  zoomView,
  type Viewport,
  WHOLE_VIEW,
} from './mapView';
import type { Point } from './data/types';

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  view: Viewport;
  width: number;
  height: number;
};

export type MapViewport = {
  svgRef: RefObject<SVGSVGElement | null>;
  view: Viewport;
  fullscreen: boolean;
  setFullscreen: Dispatch<SetStateAction<boolean>>;
  /** 拖拽后抑制一次 click，避免平移误触选点。 */
  movedRef: MutableRefObject<boolean>;
  zoomBy: (factor: number) => void;
  resetView: () => void;
  focusPoint: (point: Point, side?: number) => void;
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  endDrag: (event: ReactPointerEvent<SVGSVGElement>) => void;
};

export function useMapViewport(initial: Viewport = WHOLE_VIEW): MapViewport {
  const [view, setView] = useState<Viewport>(initial);
  const [fullscreen, setFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  const initialRef = useRef(initial);

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
  };

  const resetView = () => {
    setView(initialRef.current);
  };

  const focusPoint = (point: Point, side = 24) => {
    setView(normalizeView({ x: point.x - side / 2, y: point.y - side / 2, w: side, h: side }));
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

  return {
    svgRef,
    view,
    fullscreen,
    setFullscreen,
    movedRef,
    zoomBy,
    resetView,
    focusPoint,
    onPointerDown,
    onPointerMove,
    endDrag,
  };
}

export { MIN_VIEW, WHOLE_VIEW };
export type { Viewport };