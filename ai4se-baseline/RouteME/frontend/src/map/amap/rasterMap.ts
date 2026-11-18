/**
 * Web Mercator 栅格底图（无第三方依赖）。
 *
 * <p>本仓库的运行环境会拦截高德 JS API 2.0 的样式域名（`o4.amap.com` /
 * `custyle.amap.com` 返回 503），矢量引擎因此停在 0×0 画布；1.4 版本在该浏览器
 * 里也不生成任何 DOM。这里直接用高德公开的栅格瓦片（`webst0x.is.autonavi.com`）
 * 自己拼图：只依赖图片请求，不需要样式服务。
 *
 * <p>对外仍返回 {@link AmapMap}，这样 AmapContainer / RouteLayer / 页面代码
 * 只面对一套地图能力，不必关心底图是谁渲染的。
 */

import type { AmapLngLat, AmapMap, LngLat, MapSize } from './types';

const TILE_SIZE = 256;
const MIN_TILE_ZOOM = 3;
const MAX_TILE_ZOOM = 18;
/** Web Mercator 的有效纬度边界。 */
const MAX_LATITUDE = 85.05112878;
/** 拖动超过该像素距离才算平移，否则按点击处理。 */
const DRAG_THRESHOLD = 3;
const DEFAULT_PADDING = 60;
const DEFAULT_FIT_MAX_ZOOM = 16;

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 19;

export type TileStatus = {
  loaded: number;
  failed: number;
};

export type RasterMapOptions = {
  center: LngLat;
  zoom: number;
  /** 未发生拖动的单击（容器内像素 → 经纬度）。 */
  onClick?: (point: LngLat) => void;
  /** 瓦片加载进度：用于容器显示「加载中 / 加载失败」。 */
  onTileStatus?: (status: TileStatus) => void;
};

export type RasterTile = {
  key: string;
  src: string;
  left: number;
  top: number;
  size: number;
};

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** 指定缩放级别下整个世界的像素宽度。 */
export function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

/** 经纬度 → 世界像素（原点在左上角，缩放级别 zoom）。 */
export function projectPoint(point: LngLat, zoom: number): { x: number; y: number } {
  const lat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, point[1]));
  const size = worldSize(zoom);
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((point[0] + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * size,
  };
}

/** 世界像素 → 经纬度。 */
export function unprojectPoint(x: number, y: number, zoom: number): LngLat {
  const size = worldSize(zoom);
  const lng = (x / size) * 360 - 180;
  // 反解墨卡托：n = π - 2πy/worldSize。
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lng, lat];
}

/** 内容跟随手指/鼠标移动 (dx, dy) 像素后的新中心。 */
export function shiftCenter(center: LngLat, zoom: number, dx: number, dy: number): LngLat {
  const world = projectPoint(center, zoom);
  return unprojectPoint(world.x - dx, world.y - dy, zoom);
}

/** 高德公开栅格瓦片：style=7 为标准底图，四个子域轮询。 */
export function tileUrl(x: number, y: number, z: number): string {
  const subdomain = 1 + (((x + y) % 4) + 4) % 4;
  return `https://webst0${subdomain}.is.autonavi.com/appmaptile?style=7&x=${x}&y=${y}&z=${z}`;
}

/**
 * 视野内需要渲染的瓦片。
 *
 * <p>缩放是连续的（fitBounds 会给出小数级别），瓦片按最近的整数级别取，
 * 再按 2^(zoom-tileZoom) 缩放，避免缩放时反复更换瓦片层级。
 */
export function visibleTiles(center: LngLat, zoom: number, size: MapSize): RasterTile[] {
  if (size.width <= 0 || size.height <= 0) {
    return [];
  }
  const tileZoom = Math.max(MIN_TILE_ZOOM, Math.min(MAX_TILE_ZOOM, Math.round(zoom)));
  const scale = 2 ** (zoom - tileZoom);
  const tileSize = TILE_SIZE * scale;
  const world = projectPoint(center, zoom);
  const left = world.x - size.width / 2;
  const top = world.y - size.height / 2;
  const tileCount = 2 ** tileZoom;
  const firstX = Math.floor(left / tileSize);
  const lastX = Math.floor((left + size.width) / tileSize);
  const firstY = Math.floor(top / tileSize);
  const lastY = Math.floor((top + size.height) / tileSize);
  const tiles: RasterTile[] = [];

  for (let y = firstY; y <= lastY; y += 1) {
    if (y < 0 || y >= tileCount) {
      continue;
    }
    for (let x = firstX; x <= lastX; x += 1) {
      // 横向绕地球一圈取模，纵向不循环（极区之外没有瓦片）。
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${tileZoom}/${wrappedX}/${y}`,
        src: tileUrl(wrappedX, y, tileZoom),
        left: x * tileSize - left,
        top: y * tileSize - top,
        size: tileSize,
      });
    }
  }
  return tiles;
}

/** 让一组坐标完整落在尺寸内的中心与缩放；没有有效坐标时返回 null。 */
export function fitView(
  points: LngLat[],
  size: MapSize,
  padding: number = DEFAULT_PADDING,
  maxZoom: number = DEFAULT_FIT_MAX_ZOOM,
): { center: LngLat; zoom: number } | null {
  const valid = points.filter(
    ([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat),
  );
  if (valid.length === 0 || size.width <= 0 || size.height <= 0) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of valid) {
    const world = projectPoint(point, 0);
    minX = Math.min(minX, world.x);
    maxX = Math.max(maxX, world.x);
    minY = Math.min(minY, world.y);
    maxY = Math.max(maxY, world.y);
  }

  const usableWidth = Math.max(1, size.width - padding * 2);
  const usableHeight = Math.max(1, size.height - padding * 2);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const zoom = clampZoom(
    Math.min(maxZoom, Math.log2(usableWidth / spanX), Math.log2(usableHeight / spanY)),
  );
  return {
    center: unprojectPoint((minX + maxX) / 2, (minY + maxY) / 2, 0),
    zoom,
  };
}

/** 栅格底图实例：瓦片拼图 + 覆盖层挂载点 + 指针交互。 */
class RasterTileMap implements AmapMap {
  readonly overlay: HTMLElement;

  private readonly host: HTMLElement;
  private readonly tilePane: HTMLElement;
  private readonly options: RasterMapOptions;
  private readonly tiles = new Map<string, HTMLImageElement>();
  private readonly listeners = new Set<() => void>();
  private center: LngLat;
  private zoom: number;
  private size: MapSize = { width: 0, height: 0 };
  private pointer: {
    id: number;
    x: number;
    y: number;
    center: LngLat;
    moved: boolean;
  } | null = null;
  private loadedTiles = 0;
  private failedTiles = 0;
  private observer: ResizeObserver | null = null;
  private destroyed = false;

  constructor(host: HTMLElement, options: RasterMapOptions) {
    this.host = host;
    this.options = options;
    this.center = [options.center[0], options.center[1]];
    this.zoom = clampZoom(options.zoom);

    this.tilePane = document.createElement('div');
    this.tilePane.className = 'raster-map-tiles';
    this.overlay = document.createElement('div');
    this.overlay.className = 'raster-map-overlay';
    host.append(this.tilePane, this.overlay);

    host.addEventListener('pointerdown', this.onPointerDown);
    host.addEventListener('pointermove', this.onPointerMove);
    host.addEventListener('pointerup', this.onPointerUp);
    host.addEventListener('pointercancel', this.onPointerUp);
    host.addEventListener('wheel', this.onWheel, { passive: false });
    host.addEventListener('dblclick', this.onDoubleClick);

    this.measure();
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(host);
    }
    this.renderTiles();
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(zoom: number): void {
    this.setZoomAndCenter(zoom, this.center);
  }

  setCenter(center: LngLat): void {
    this.setZoomAndCenter(this.zoom, center);
  }

  setZoomAndCenter(zoom: number, center: LngLat): void {
    const nextZoom = clampZoom(zoom);
    const sameCenter = center[0] === this.center[0] && center[1] === this.center[1];
    if (nextZoom === this.zoom && sameCenter) {
      return;
    }
    this.zoom = nextZoom;
    this.center = [center[0], center[1]];
    this.renderTiles();
    this.emitChange();
  }

  getCenter(): AmapLngLat {
    return {
      getLng: () => this.center[0],
      getLat: () => this.center[1],
    };
  }

  getSize(): MapSize {
    return { width: this.size.width, height: this.size.height };
  }

  project(point: LngLat): { x: number; y: number } {
    const world = projectPoint(point, this.zoom);
    const centerWorld = projectPoint(this.center, this.zoom);
    return {
      x: world.x - centerWorld.x + this.size.width / 2,
      y: world.y - centerWorld.y + this.size.height / 2,
    };
  }

  unproject(x: number, y: number): LngLat {
    const centerWorld = projectPoint(this.center, this.zoom);
    return unprojectPoint(
      centerWorld.x + x - this.size.width / 2,
      centerWorld.y + y - this.size.height / 2,
      this.zoom,
    );
  }

  fitBounds(points: LngLat[], padding?: number, maxZoom?: number): void {
    const view = fitView(points, this.size, padding, maxZoom);
    if (view !== null) {
      this.setZoomAndCenter(view.zoom, view.center);
    }
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  resize(): void {
    if (this.destroyed) {
      return;
    }
    const next = { width: this.host.clientWidth, height: this.host.clientHeight };
    if (next.width === this.size.width && next.height === this.size.height) {
      return;
    }
    this.size = next;
    this.renderTiles();
    this.emitChange();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.observer?.disconnect();
    this.observer = null;
    this.host.removeEventListener('pointerdown', this.onPointerDown);
    this.host.removeEventListener('pointermove', this.onPointerMove);
    this.host.removeEventListener('pointerup', this.onPointerUp);
    this.host.removeEventListener('pointercancel', this.onPointerUp);
    this.host.removeEventListener('wheel', this.onWheel);
    this.host.removeEventListener('dblclick', this.onDoubleClick);
    for (const tile of this.tiles.values()) {
      this.detachTile(tile);
    }
    this.tiles.clear();
    this.listeners.clear();
    this.tilePane.remove();
    this.overlay.remove();
  }

  private measure(): void {
    this.size = { width: this.host.clientWidth, height: this.host.clientHeight };
  }

  private emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private renderTiles(): void {
    if (this.destroyed) {
      return;
    }
    const wanted = new Set<string>();
    for (const tile of visibleTiles(this.center, this.zoom, this.size)) {
      wanted.add(tile.key);
      let image = this.tiles.get(tile.key);
      if (image === undefined) {
        image = document.createElement('img');
        image.className = 'raster-map-tile';
        image.alt = '';
        image.decoding = 'async';
        image.draggable = false;
        image.addEventListener('load', this.onTileLoad);
        image.addEventListener('error', this.onTileError);
        image.src = tile.src;
        this.tilePane.appendChild(image);
        this.tiles.set(tile.key, image);
      }
      // 多留 1px 覆盖相邻瓦片，规避小数缩放下的 1px 白缝。
      image.style.width = `${tile.size + 1}px`;
      image.style.height = `${tile.size + 1}px`;
      image.style.transform = `translate3d(${tile.left.toFixed(2)}px, ${tile.top.toFixed(2)}px, 0)`;
    }

    for (const [key, image] of this.tiles) {
      if (!wanted.has(key)) {
        this.detachTile(image);
        this.tiles.delete(key);
      }
    }
  }

  private detachTile(image: HTMLImageElement): void {
    image.removeEventListener('load', this.onTileLoad);
    image.removeEventListener('error', this.onTileError);
    image.remove();
  }

  private notifyTileStatus(): void {
    this.options.onTileStatus?.({
      loaded: this.loadedTiles,
      failed: this.failedTiles,
    });
  }

  private readonly onTileLoad = (): void => {
    this.loadedTiles += 1;
    this.notifyTileStatus();
  };

  private readonly onTileError = (): void => {
    this.failedTiles += 1;
    this.notifyTileStatus();
  };

  /** 以容器内 (x, y) 为锚点缩放：鼠标下的地点保持不动。 */
  private zoomAround(zoom: number, x: number, y: number): void {
    const nextZoom = clampZoom(zoom);
    if (nextZoom === this.zoom) {
      return;
    }
    const anchor = this.unproject(x, y);
    this.zoom = nextZoom;
    const anchorWorld = projectPoint(anchor, nextZoom);
    const centerWorld = {
      x: anchorWorld.x - x + this.size.width / 2,
      y: anchorWorld.y - y + this.size.height / 2,
    };
    this.center = unprojectPoint(centerWorld.x, centerWorld.y, nextZoom);
    this.renderTiles();
    this.emitChange();
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (event.deltaY === 0) {
      return;
    }
    event.preventDefault();
    const rect = this.host.getBoundingClientRect();
    const step = event.deltaY > 0 ? -0.5 : 0.5;
    this.zoomAround(this.zoom + step, event.clientX - rect.left, event.clientY - rect.top);
  };

  /** 双击放大：地图交互的常见预期（与 + 按钮同一缩放级别步长）。 */
  private readonly onDoubleClick = (event: MouseEvent): void => {
    const rect = this.host.getBoundingClientRect();
    this.zoomAround(
      this.zoom + 1,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || event.target !== this.host) {
      // 覆盖层标记（RouteLayer）自己处理点击，不抢事件。
      return;
    }
    event.preventDefault();
    this.pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      center: this.center,
      moved: false,
    };
    this.host.classList.add('is-dragging');
    try {
      this.host.setPointerCapture(event.pointerId);
    } catch {
      // 某些浏览器/元素不支持捕获，拖动仍可依赖冒泡事件。
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const pointer = this.pointer;
    if (pointer === null || event.pointerId !== pointer.id) {
      return;
    }
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return;
      }
      pointer.moved = true;
    }
    event.preventDefault();
    this.center = shiftCenter(pointer.center, this.zoom, dx, dy);
    this.renderTiles();
    this.emitChange();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const pointer = this.pointer;
    if (pointer === null || event.pointerId !== pointer.id) {
      return;
    }
    this.pointer = null;
    this.host.classList.remove('is-dragging');
    try {
      this.host.releasePointerCapture(event.pointerId);
    } catch {
      // 捕获已释放时忽略。
    }
    if (pointer.moved || event.type === 'pointercancel') {
      return;
    }
    const rect = this.host.getBoundingClientRect();
    this.options.onClick?.(
      this.unproject(event.clientX - rect.left, event.clientY - rect.top),
    );
  };
}

export function createRasterMap(host: HTMLElement, options: RasterMapOptions): AmapMap {
  const map = new RasterTileMap(host, options);
  // 调试 / E2E 钩子：把实例挂在宿主上，便于按经纬度投影模拟点击（不影响渲染）。
  (host as HTMLElement & { __rasterMap?: AmapMap }).__rasterMap = map;
  return map;
}