/** 高德 JS API 2.0 的最小类型声明（项目不额外引第三方 @types）。 */

export type LngLat = [number, number];

export type AmapLngLat = {
  getLng(): number;
  getLat(): number;
};

export type AmapMapEvent = {
  lnglat?: AmapLngLat;
};

export type AmapMap = {
  destroy(): void;
  resize(): void;
  setZoomAndCenter(zoom: number, center: LngLat, immediately?: boolean): void;
  setZoom(zoom: number): void;
  setCenter(center: LngLat): void;
  getCenter(): AmapLngLat;
  getZoom(): number;
  setFitView(overlays?: unknown[], immediately?: boolean, avoid?: number[], maxZoom?: number): void;
  add(overlay: unknown | unknown[]): void;
  remove(overlay: unknown | unknown[]): void;
  clearMap(): void;
  on(event: string, handler: (event: AmapMapEvent) => void): void;
  off(event: string, handler?: (event: AmapMapEvent) => void): void;
};

export type AmapMarker = {
  setMap(map: AmapMap | null): void;
  setPosition(position: LngLat): void;
  setContent(content: string | HTMLElement): void;
  setzIndex(index: number): void;
  getPosition(): AmapLngLat | undefined;
  on(event: string, handler: () => void): void;
};

export type AmapPolyline = {
  setMap(map: AmapMap | null): void;
  setPath(path: LngLat[]): void;
};

export type AmapPixel = { getX(): number; getY(): number };

export type AmapNamespace = {
  Map: new (container: string | HTMLElement, options: Record<string, unknown>) => AmapMap;
  Marker: new (options: Record<string, unknown>) => AmapMarker;
  Polyline: new (options: Record<string, unknown>) => AmapPolyline;
  Pixel: new (x: number, y: number) => AmapPixel;
};

declare global {
  interface Window {
    AMap?: AmapNamespace;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
      serviceHost?: string;
    };
  }
}