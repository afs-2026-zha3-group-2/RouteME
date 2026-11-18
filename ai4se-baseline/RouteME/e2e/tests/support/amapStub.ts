/**
 * window.AMap 替身：让路线 / 搜索 / 逆地理在离线环境里可判定。
 *
 * <p>从 `ai-planner.spec.ts` 抽出，供 AI 规划与发布页路线编辑器共用；
 * 保留既有全局名（`__amapPois` / `__amapRouteCalls` / `__amapStubConfig` /
 * `__amapClick` / `__amapLastMap`），新增 `__amapTransferOptions` 记录公共交通
 * 的构造参数（换乘城市断言）。
 */

import type { Page } from '@playwright/test';

export async function installAmapStub(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    // 代理探测也必须放行：真实后端对 Web 端 Key 返回 USERKEY_PLAT_NOMATCH，
    // 探测失败时 `loadSdk` 会在读 `window.AMap` 之前就抛错，替身等于没装。
    const realFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v3/ip')) {
        return Promise.resolve(
          new Response(JSON.stringify({ status: '1', info: 'OK', infocode: '10000' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return realFetch(input as RequestInfo, init);
    };
    w.__amapPois = [
      { name: '广州南站', lng: 113.269, lat: 22.989, address: '广州市番禺区石壁街道', city: '广州市', district: '番禺区', type: '交通设施服务;火车站;火车站' },
      { name: '广州市', lng: 113.264, lat: 23.129, address: '广东省广州市', city: '广州市', district: '越秀区', type: '地名地址信息;普通地名;城市级地名' },
      { name: '广州塔', lng: 113.3245, lat: 23.1064, address: '广州市海珠区阅江西路 222 号', city: '广州市', district: '海珠区', type: '风景名胜;风景名胜;风景名胜' },
      { name: '海心沙', lng: 113.3217, lat: 23.1104, address: '广州市天河区临江大道', city: '广州市', district: '天河区', type: '风景名胜;公园广场;公园' },
      { name: '花城广场', lng: 113.3236, lat: 23.1203, address: '广州市天河区珠江新城', city: '广州市', district: '天河区', type: '风景名胜;公园广场;城市广场' },
      { name: '北京路步行街', lng: 113.2644, lat: 23.1291, address: '广州市越秀区北京路', city: '广州市', district: '越秀区', type: '购物服务;特色商业街;步行街' },
      { name: '永庆坊', lng: 113.2374, lat: 23.1148, address: '广州市荔湾区恩宁路', city: '广州市', district: '荔湾区', type: '风景名胜;风景名胜;风景名胜' },
      { name: '广东省博物馆', lng: 113.3265, lat: 23.1148, address: '广州市天河区珠江东路 2 号', city: '广州市', district: '天河区', type: '科教文化服务;博物馆;博物馆' },
      { name: '香洲港', lng: 113.5767, lat: 22.2859, address: '珠海市香洲区情侣中路', city: '珠海市', district: '香洲区', type: '交通设施服务;港口码头;港口码头' },
      { name: '情侣路', lng: 113.5767, lat: 22.2759, address: '珠海市香洲区情侣路', city: '珠海市', district: '香洲区', type: '风景名胜;风景名胜;风景名胜' },
    ];
    w.__amapRouteCalls = [];
    w.__amapStubConfig = { routeFail: false };
    w.__amapLastMap = null;
    w.__amapTransferOptions = null;

    const ll = (lng: number, lat: number) => ({ getLng: () => lng, getLat: () => lat });
    const toSdkPoi = (p: any) => ({
      id: `poi-${p.name}`, name: p.name, address: p.address, cityname: p.city,
      adname: p.district, type: p.type, location: ll(p.lng, p.lat),
    });

    class LngLat {
      lng: number; lat: number;
      constructor(lng: number, lat: number) { this.lng = lng; this.lat = lat; }
      getLng() { return this.lng; }
      getLat() { return this.lat; }
    }
    class Pixel {
      x: number; y: number;
      constructor(x: number, y: number) { this.x = x; this.y = y; }
    }
    class Marker {
      el: HTMLDivElement; handlers: Record<string, Array<() => void>> = {};
      constructor(opts: any = {}) {
        this.el = document.createElement('div');
        this.el.className = 'amap-stub-marker';
        if (typeof opts.content === 'string') { this.el.innerHTML = opts.content; }
        this.el.addEventListener('click', () => (this.handlers.click ?? []).forEach((fn) => fn()));
      }
      on(event: string, fn: () => void) { (this.handlers[event] ??= []).push(fn); }
      setMap(map: unknown) {
        if (map === null && this.el.parentNode) { this.el.parentNode.removeChild(this.el); }
      }
    }
    class Polyline {
      constructor(_opts: any = {}) {}
      setMap(_map: unknown) {}
    }
    class Map {
      host: HTMLElement; zoom: number; handlers: Record<string, Array<(event: any) => void>> = {};
      constructor(host: HTMLElement, opts: any = {}) {
        this.host = host;
        this.zoom = opts.zoom ?? 11;
        w.__amapLastMap = this;
      }
      on(event: string, fn: (event: any) => void) { (this.handlers[event] ??= []).push(fn); }
      off(event: string, fn: (event: any) => void) {
        this.handlers[event] = (this.handlers[event] ?? []).filter((entry) => entry !== fn);
      }
      add(items: any) {
        for (const item of [].concat(items)) {
          if (item && item.el) { this.host.appendChild(item.el); }
        }
      }
      remove(items: any) {
        for (const item of [].concat(items)) {
          if (item && item.el && item.el.parentNode) { item.el.parentNode.removeChild(item.el); }
        }
      }
      setZoomAndCenter(zoom: number, _center: unknown) { this.zoom = zoom; }
      getZoom() { return this.zoom; }
      setZoom(zoom: number) { this.zoom = zoom; }
      resize() {}
      setFitView() {}
      destroy() { this.host.innerHTML = ''; w.__amapLastMap = null; }
    }
    class PlaceSearch {
      constructor(_opts: any = {}) {}
      search(keyword: string, cb: (status: string, result: any) => void) {
        const kw = String(keyword ?? '').trim();
        const pois = w.__amapPois.filter((p: any) => p.name.includes(kw));
        if (pois.length === 0) { cb('no_data', { info: 'NO_DATA', infocode: '10000' }); return; }
        cb('complete', { info: 'OK', infocode: '10000', poiList: { pois: pois.map(toSdkPoi) } });
      }
      searchNearBy(_keyword: string, center: [number, number], _radius: number, cb: (status: string, result: any) => void) {
        const [lng, lat] = center;
        const distance = (p: any) => (p.lng - lng) ** 2 + (p.lat - lat) ** 2;
        const sorted = [...w.__amapPois].sort((a: any, b: any) => distance(a) - distance(b));
        cb('complete', { info: 'OK', infocode: '10000', poiList: { pois: sorted.slice(0, 5).map(toSdkPoi) } });
      }
    }
    class Geocoder {
      constructor(_opts: any = {}) {}
      getLocation(address: string, cb: (status: string, result: any) => void) {
        const poi = w.__amapPois.find((p: any) => p.name === String(address ?? '').trim());
        if (poi === undefined) { cb('no_data', { info: 'NO_DATA', infocode: '10000' }); return; }
        cb('complete', {
          info: 'OK', infocode: '10000',
          geocodes: [{ location: ll(poi.lng, poi.lat), formattedAddress: poi.address, province: '广东省', city: poi.city, district: poi.district }],
        });
      }
    }
    // 每段里程固定 2100 米：4 个已解析 POI → 3 段 = 6300 米。
    // 时长按出行方式区分，发布页切换「自驾 / 骑行 / 公共交通」时要能观察到重算；
    // transit 保持 900 秒（AI 规划页断言 45 分钟 = 3 × 900）。
    const LEG_SECONDS: Record<string, number> = {
      walking: 900,
      transit: 900,
      driving: 600,
      bicycling: 1200,
    };
    const makeRouteService = (mode: string) => class {
      constructor(opts: any = {}) {
        if (mode === 'transit') { w.__amapTransferOptions = opts; }
      }
      search(origin: [number, number], destination: [number, number], cb: (status: string, result: any) => void) {
        w.__amapRouteCalls.push({ mode, origin, destination });
        if (w.__amapStubConfig.routeFail) { cb('error', { info: 'ROUTE_FAILED', infocode: '20800' }); return; }
        const path = [ll(origin[0], origin[1]), ll(destination[0], destination[1])];
        const duration = LEG_SECONDS[mode] ?? 900;
        if (mode === 'transit') {
          cb('complete', {
            info: 'OK', infocode: '10000',
            routes: [{ transits: [{ distance: 2100, cost: { duration }, segments: [
              { walking: { steps: [{ path }] } },
              { bus: { buslines: [{ polyline: `${origin[0]},${origin[1]};${destination[0]},${destination[1]}` }] } },
            ] }] }],
          });
          return;
        }
        cb('complete', { info: 'OK', infocode: '10000', routes: [{ distance: 2100, time: duration, steps: [{ path }] }] });
      }
    };

    w.AMap = {
      Map, Marker, Polyline, Pixel, LngLat,
      plugin: (_names: string[], cb?: () => void) => cb?.(),
      PlaceSearch, Geocoder,
      Walking: makeRouteService('walking'),
      Driving: makeRouteService('driving'),
      Riding: makeRouteService('bicycling'),
      Transfer: makeRouteService('transit'),
    };
    // 底图为栅格瓦片（createRasterMap）：点击走宿主 pointerdown/up，按实例投影取像素。
    // scope 用于一页多个地图（发布页路线编辑器 + 集合区域）时指定宿主。
    w.__amapClick = (lng: number, lat: number, scope?: string) => {
      const host = document.querySelector(
        scope ?? '.amap-canvas-host',
      ) as (HTMLElement & { __rasterMap?: any }) | null;
      const map = host?.__rasterMap;
      if (!host || !map) { return; }
      const rect = host.getBoundingClientRect();
      const pixel = map.project([lng, lat]);
      const clientX = rect.left + pixel.x;
      const clientY = rect.top + pixel.y;
      const init = { bubbles: true, button: 0, pointerId: 1, clientX, clientY };
      host.dispatchEvent(new PointerEvent('pointerdown', init));
      host.dispatchEvent(new PointerEvent('pointerup', init));
    };
  });
}

/** 切换路线服务失败开关（直线降级）。 */
export async function setAmapRouteFail(page: Page, fail: boolean) {
  await page.evaluate((value) => {
    (window as any).__amapStubConfig.routeFail = value;
  }, fail);
}

/** 在指定地图宿主上模拟一次点击（经纬度由底图实例投影成像素）。 */
export async function clickMapAt(
  page: Page,
  lng: number,
  lat: number,
  scope?: string,
) {
  await page.evaluate(
    ([x, y, selector]) => (window as any).__amapClick(x, y, selector),
    [lng, lat, scope] as [number, number, string | undefined],
  );
}