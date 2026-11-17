/** 地图组件的最小类型声明（渲染不依赖高德 JS 引擎）。 */

export type LngLat = [number, number];

export type MapSize = { width: number; height: number };

export type AmapLngLat = {
  getLng(): number;
  getLat(): number;
};

/**
 * 地图实例能力：栅格底图自己渲染，业务组件只依赖这套接口。
 *
 * <p>名字沿用 `AmapMap` 以保持调用方不变；实现是
 * `map/amap/rasterMap.ts` 的 Web Mercator 瓦片地图。
 */
export type AmapMap = {
  /** 覆盖层挂载点：与地图同坐标系，子元素用 `project()` 定位。 */
  readonly overlay: HTMLElement | null;
  getZoom(): number;
  setZoom(zoom: number): void;
  setZoomAndCenter(zoom: number, center: LngLat): void;
  setCenter(center: LngLat): void;
  getCenter(): AmapLngLat;
  getSize(): MapSize;
  /** 经纬度 → 容器内像素（左上角原点）。 */
  project(point: LngLat): { x: number; y: number };
  /** 容器内像素 → 经纬度。 */
  unproject(x: number, y: number): LngLat;
  /** 让一组坐标完整落在视野内。 */
  fitBounds(points: LngLat[], padding?: number, maxZoom?: number): void;
  /** 视野/尺寸变化时回调，返回取消订阅函数。 */
  onChange(listener: () => void): () => void;
  resize(): void;
  destroy(): void;
};

/** 高德 JS API 脚本命名空间（仅地理编码/搜索等 Web 服务使用）。 */
export type AmapNamespace = {
  v?: string;
  plugin?(names: string[], callback?: () => void): void;
  [key: string]: unknown;
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