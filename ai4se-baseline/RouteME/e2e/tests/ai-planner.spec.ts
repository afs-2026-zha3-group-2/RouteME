/**
 * AI 智能规划页 E2E（add-ai-itinerary A1–A12）。
 *
 * 替身口径（atdd §2.2 的实现偏离，记录于 P4 verify 报告）：
 * - AmapService 已 SDK 化（JS API 插件直连，REST 代理对 Web Key 返回
 *   USERKEY_PLAT_NOMATCH），因此高德侧用 `window.AMap` 替身（addInitScript）
 *   而非 REST 拦截；loader 见到 window.AMap 立即 resolve，CI 无 JS Key 也能
 *   渲染地图与编号 Marker，Marker 断言不分级、恒跑。
 * - AI / 天气用 `page.route` 拦截（可变 state 分发夹具与失败注入）。
 * - 快照保存 / 发布 / 详情 / 首页走真实后端（fresh SQLite），验证落库链路。
 */
import { expect, test, type Page } from '@playwright/test';
import { API, isoDaysFromToday, loginAs, switchUser } from './support';

/* ---------- 夹具 ---------- */

const DAY = isoDaysFromToday(4);

type PlanKey = 'default' | 'unresolved' | 'rainy' | 'hot' | 'cold' | 'overBudget' | 'lowBudget';
type WeatherKey = 'default' | 'rainy' | 'hot' | 'cold';

type StubState = {
  aiStatus: number;
  aiDelayMs: number;
  plan: PlanKey;
  weatherStatus: number;
  weather: WeatherKey;
  aiRequests: Record<string, unknown>[];
};

function freshState(): StubState {
  return { aiStatus: 200, aiDelayMs: 0, plan: 'default', weatherStatus: 200, weather: 'default', aiRequests: [] };
}

function stop(name: string, arrival: string, stayMinutes: number, indoor: boolean, reason: string) {
  return { name, arrival, stay_minutes: stayMinutes, indoor, reason };
}

const BASE_STOPS = [
  stop('广州塔', '09:00', 120, false, '城市地标，俯瞰珠江'),
  stop('海心沙', '11:30', 60, false, '江景开阔，适合拍照'),
  stop('花城广场', '13:30', 90, false, '城市中轴线核心'),
  stop('北京路步行街', '16:00', 120, false, '美食与骑楼老街'),
];

const BUDGET_460 = { transport_cents: 8000, tickets_cents: 15000, food_cents: 18000, other_cents: 5000, total_cents: 46000 };
const BUDGET_580 = { transport_cents: 10000, tickets_cents: 20000, food_cents: 22000, other_cents: 6000, total_cents: 58000 };
const BUDGET_370 = { transport_cents: 6000, tickets_cents: 12000, food_cents: 15000, other_cents: 4000, total_cents: 37000 };

function planFixture(key: PlanKey) {
  const base = { title: '广州 1 日游', tips: ['当天紫外线较强且户外行程较多，注意防晒补水'], packing: ['防晒霜', '帽子', '饮用水'], budget: BUDGET_460 };
  switch (key) {
    case 'unresolved':
      return { ...base, days: [{ day: 1, stops: [BASE_STOPS[0], stop('神秘景点', '11:30', 60, false, 'AI 推荐但高德搜不到'), BASE_STOPS[2], BASE_STOPS[3]] }] };
    case 'rainy':
      return {
        ...base,
        tips: ['降雨概率较高，建议携带雨伞和防水鞋，优先室内活动'],
        packing: ['雨伞', '防水鞋'],
        days: [{ day: 1, stops: [stop('广东省博物馆', '09:00', 120, true, '室内展馆，雨天首选'), stop('广州塔', '11:30', 90, true, '塔内观景不受降雨影响'), BASE_STOPS[2], BASE_STOPS[3]] }],
      };
    case 'hot':
      return { ...base, tips: ['高温且紫外线很强，建议防晒霜、帽子和饮用水，减少中午长时间户外活动'], days: [{ day: 1, stops: BASE_STOPS }] };
    case 'cold':
      return { ...base, tips: ['早晚温差较大，建议携带外套，注意保暖'], packing: ['外套', '围巾'], days: [{ day: 1, stops: BASE_STOPS }] };
    case 'overBudget':
      return { ...base, budget: BUDGET_580, days: [{ day: 1, stops: BASE_STOPS }] };
    case 'lowBudget':
      return { ...base, budget: BUDGET_370, days: [{ day: 1, stops: BASE_STOPS }] };
    default:
      return { ...base, days: [{ day: 1, stops: BASE_STOPS }] };
  }
}

function weatherFixture(key: WeatherKey, date: string) {
  const base = { precipitation_mm: 0, wind_speed_kmh: 12.5 };
  let daily;
  switch (key) {
    case 'rainy':
      daily = { ...base, temp_max_c: 22, temp_min_c: 18, precipitation_probability_pct: 80, precipitation_mm: 12.5, weather_code: 61, weather_text: '小雨', wind_speed_kmh: 18, uv_index: 2 };
      break;
    case 'hot':
      daily = { ...base, temp_max_c: 35, temp_min_c: 27, precipitation_probability_pct: 5, weather_code: 0, weather_text: '晴', wind_speed_kmh: 8, uv_index: 9 };
      break;
    case 'cold':
      daily = { ...base, temp_max_c: 14, temp_min_c: 8, precipitation_probability_pct: 10, weather_code: 2, weather_text: '多云', wind_speed_kmh: 20, uv_index: 3 };
      break;
    default:
      daily = { ...base, temp_max_c: 24, temp_min_c: 17, precipitation_probability_pct: 20, weather_code: 1, weather_text: '多云', uv_index: 6 };
  }
  // 契约 0.17.0：天气复用 add-trip-weather 嵌套形状（weather.daily + available + reminders）。
  return {
    date,
    destination_code: '440100',
    city: '广州市',
    lng: 113.264,
    lat: 23.129,
    available: true,
    reason: null,
    weather: daily,
    reminders: [],
    source: 'open-meteo',
  };
}

/* ---------- window.AMap 替身 ---------- */

async function installAmapStub(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
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
    // 每段固定 2100 米 / 900 秒：4 个已解析 POI → 3 段 = 6300 米 / 2700 秒。
    const makeRouteService = (mode: string) => class {
      constructor(_opts: any = {}) {}
      search(origin: [number, number], destination: [number, number], cb: (status: string, result: any) => void) {
        w.__amapRouteCalls.push({ mode, origin, destination });
        if (w.__amapStubConfig.routeFail) { cb('error', { info: 'ROUTE_FAILED', infocode: '20800' }); return; }
        const path = [ll(origin[0], origin[1]), ll(destination[0], destination[1])];
        if (mode === 'transit') {
          cb('complete', {
            info: 'OK', infocode: '10000',
            routes: [{ transits: [{ distance: 2100, cost: { duration: 900 }, segments: [
              { walking: { steps: [{ path }] } },
              { bus: { buslines: [{ polyline: `${origin[0]},${origin[1]};${destination[0]},${destination[1]}` }] } },
            ] }] }],
          });
          return;
        }
        cb('complete', { info: 'OK', infocode: '10000', routes: [{ distance: 2100, time: 900, steps: [{ path }] }] });
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
    w.__amapClick = (lng: number, lat: number) => {
      const host = document.querySelector('.amap-canvas-host') as (HTMLElement & { __rasterMap?: any }) | null;
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

/* ---------- AI / 天气 page.route 替身 ---------- */

async function installApiStubs(page: Page, state: StubState) {
  await page.route('**/api/ai/itineraries/generate', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    state.aiRequests.push(body);
    if (state.aiDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, state.aiDelayMs));
    }
    if (state.aiStatus !== 200) {
      const code = state.aiStatus === 503 ? 'AI_NOT_CONFIGURED' : 'AI_UPSTREAM_ERROR';
      await route.fulfill({ status: state.aiStatus, contentType: 'application/json', body: JSON.stringify({ code, message: 'AI 生成失败' }) });
      return;
    }
    const planKey: PlanKey = body.reduce_budget === true ? 'lowBudget' : state.plan;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: planFixture(planKey), weather: weatherFixture(state.weather, String(body.date ?? DAY)) }),
    });
  });
  await page.route('**/api/weather/forecast**', async (route) => {
    const url = new URL(route.request().url());
    const date = url.searchParams.get('date') ?? DAY;
    if (state.weatherStatus !== 200) {
      await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ code: 'WEATHER_UPSTREAM_ERROR', message: '天气获取失败' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(weatherFixture(state.weather, date)) });
  });
}

/* ---------- 页面操作助手 ---------- */

/** 规划条件收在抽屉里（参考稿版式）：先展开，填完再收起，避免遮住预览。 */
async function openConditions(page: Page) {
  if ((await page.getByTestId('ai-generate').count()) === 0) {
    await page.getByTestId('ai-conditions-toggle').click();
  }
  await expect(page.getByTestId('ai-generate')).toBeVisible();
}

async function closeConditions(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ai-generate')).toHaveCount(0);
}

/** 地图编号 Marker 在「查看地图」弹窗里：读一遍再关掉。 */
async function mapStopNumbers(page: Page): Promise<(string | null)[]> {
  await page.getByTestId('ai-map-toggle').click();
  await expect(page.locator('.amap-stop-number').first()).toBeVisible();
  const numbers = await page
    .locator('.amap-stop-number')
    .evaluateAll((els) => els.map((el) => el.textContent));
  await page.keyboard.press('Escape');
  return numbers;
}

async function pickAiPlace(page: Page, fieldTestid: string, name: string) {
  await openConditions(page);
  const field = page.getByTestId(fieldTestid);
  const input = field.locator('input').first();
  await input.fill(name);
  await field.locator('.amap-search-item', { hasText: name }).first().waitFor();
  await input.press('Enter');
}

async function setAiDate(page: Page, day: string) {
  await openConditions(page);
  const input = page.getByTestId('ai-date').locator('input');
  await input.fill(day);
  await input.press('Enter');
}

async function fillRequired(page: Page, day = DAY) {
  await pickAiPlace(page, 'ai-origin-field', '广州南站');
  await expect(page.getByTestId('ai-origin-name')).toContainText('广州南站');
  await pickAiPlace(page, 'ai-destination-field', '广州市');
  await expect(page.getByTestId('ai-destination-name')).toContainText('广州市');
  await setAiDate(page, day);
}

async function generate(page: Page) {
  await openConditions(page);
  await page.getByTestId('ai-generate').click();
  await closeConditions(page);
  await expect(page.getByTestId('ai-stop').first()).toBeVisible();
}

async function stopNames(page: Page): Promise<(string | null)[]> {
  return page.getByTestId('ai-stop').evaluateAll((els) => els.map((el) => el.getAttribute('data-name')));
}

async function routeCallCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__amapRouteCalls.length);
}

/** 发布页手选目的地（沿用 trips.spec.ts 的 AreaCascader 模式）。 */
async function pickDestination(page: Page, province: string, city: string) {
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('.area-option', { hasText: province }).first().click();
  await page.locator('.area-option', { hasText: city }).first().click();
}

async function pickPlace(page: Page, field: string, name: string) {
  // 限定 textbox 角色，避免 getByLabel 子串命中高德 region 的 aria-label。
  const input = page.getByRole('textbox', { name: field });
  await input.fill(name);
  await page.locator('.amap-search-item', { hasText: name }).first().waitFor();
  await input.press('Enter');
  await expect(page.locator('.place-chip-name', { hasText: name }).first()).toBeVisible();
}

async function expandPageSize(page: Page) {
  const select = page.getByLabel('每页条数');
  if ((await select.count()) > 0) {
    await select.selectOption('45');
  }
}

let state: StubState;

test.beforeEach(async ({ page }) => {
  state = freshState();
  await loginAs(page, 1);
  await installAmapStub(page);
  await installApiStubs(page, state);
  await page.goto('/#/ai-planner');
});

/* ---------- A1 门控与条件（E1/E3/E4/E5/E6） ---------- */

test('A1 gates generation on required fields and carries optional conditions', async ({ page }) => {
  await openConditions(page);
  const generateButton = page.getByTestId('ai-generate');
  await expect(generateButton).toBeDisabled();

  await pickAiPlace(page, 'ai-origin-field', '广州南站');
  await expect(page.getByTestId('ai-origin-name')).toContainText('广州南站');
  await expect(generateButton).toBeDisabled();

  await pickAiPlace(page, 'ai-destination-field', '广州市');
  await expect(page.getByTestId('ai-destination-name')).toContainText('广州市');
  await expect(generateButton).toBeDisabled();

  await setAiDate(page, DAY);
  await expect(generateButton).toBeEnabled();

  // 可选条件：预算 / 节奏 / 兴趣可改且进入请求体。
  await page.getByTestId('ai-budget').locator('input').fill('500');
  await page.getByTestId('ai-pace').getByText('紧凑', { exact: true }).click();
  // 兴趣是可点的胶囊选项（参考稿）：点一下即选中，不需要下拉。
  await page.getByTestId('ai-interests').getByText('美食', { exact: true }).click();

  await generateButton.click();
  await closeConditions(page);
  await expect(page.getByTestId('ai-stop').first()).toBeVisible();
  expect(state.aiRequests).toHaveLength(1);
  const request = state.aiRequests[0] as any;
  expect(request.origin).toEqual({ name: '广州南站', lng: 113.269, lat: 22.989 });
  expect(request.destination).toEqual({ name: '广州市', lng: 113.264, lat: 23.129 });
  expect(request.date).toBe(DAY);
  expect(request.duration).toBe('one_day');
  expect(request.travel_mode).toBe('transit');
  expect(request.pace).toBe('compact');
  expect(request.budget_cents).toBe(50000);
  expect(request.interests).toEqual(['美食']);
  expect(request.reduce_budget).toBe(false);

  // 地图点击选点（E3）：抽屉里的「地图选点」打开弹窗 → 切到出发地 → 点地图 → 候选 → 确认。
  await openConditions(page);
  await page.getByTestId('ai-map-pick').click();
  await page.getByTestId('ai-map-pick-target').getByText('出发地', { exact: true }).click();
  await page.evaluate(() => (window as any).__amapClick(113.3236, 23.1203));
  const candidates = page.getByTestId('ai-map-candidates');
  await expect(candidates).toBeVisible();
  await candidates.getByRole('button', { name: /花城广场/ }).first().click();
  await page.keyboard.press('Escape');
  await openConditions(page);
  await expect(page.getByTestId('ai-origin-name')).toContainText('花城广场');
});

/* ---------- A2 定位出发地（E2） ---------- */

test('A2 fills origin from geolocation and degrades gracefully when denied', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 22.989, longitude: 113.269 });

  await openConditions(page);
  await page.getByTestId('ai-origin-field').getByRole('button', { name: '使用当前定位' }).click();
  // 定位坐标反查附近 POI：替身最近点为广州南站。
  await expect(page.getByTestId('ai-origin-name')).toContainText('广州南站');

  // 拒绝授权档：内联错误不阻塞表单。
  await page.addInitScript(() => {
    (navigator.geolocation as any).getCurrentPosition = (
      _success: unknown,
      error?: (reason: { code: number; message: string }) => void,
    ) => error?.({ code: 1, message: 'User denied Geolocation' });
  });
  await page.reload();
  await openConditions(page);
  await page.getByTestId('ai-origin-field').getByRole('button', { name: '使用当前定位' }).click();
  await expect(page.getByTestId('ai-origin-field').getByRole('alert')).toContainText('定位失败');
  await pickAiPlace(page, 'ai-origin-field', '广州南站');
  await expect(page.getByTestId('ai-origin-name')).toContainText('广州南站');
});

/* ---------- A3 生成完整行程（E7/E9/E18/E25/E28） ---------- */

test('A3 generates a complete itinerary with weather, budget and AMap stats', async ({ page }) => {
  await fillRequired(page);
  await page.getByTestId('ai-budget').locator('input').fill('500');

  state.aiDelayMs = 800;
  await page.getByTestId('ai-generate').click();
  await expect(page.getByTestId('ai-loading')).toBeVisible();
  await expect(page.getByTestId('ai-stop').first()).toBeVisible();
  await expect(page.getByTestId('ai-loading')).toHaveCount(0);

  // 时间轴：4 个 POI、顺序、到达时间、理由、停留。
  expect(await stopNames(page)).toEqual(['广州塔', '海心沙', '花城广场', '北京路步行街']);
  const timeline = page.getByTestId('ai-timeline');
  await expect(timeline).toContainText('09:00');
  await expect(timeline).toContainText('城市地标，俯瞰珠江');
  await expect(timeline).toContainText('120');

  // 天气卡 = generate 响应天气（L-02 权威路径）。
  const weatherCard = page.getByTestId('ai-weather-card');
  await expect(weatherCard).toContainText('24');
  await expect(weatherCard).toContainText('17');
  await expect(weatherCard).toContainText('20%');
  await expect(weatherCard).toContainText('多云');

  // Tips 与装备。
  await expect(page.getByTestId('ai-tips')).toContainText('防晒');
  const packing = page.getByTestId('ai-packing');
  await expect(packing).toContainText('防晒霜');
  await expect(packing).toContainText('帽子');
  await expect(packing).toContainText('饮用水');

  // 预算四项 + 合计（参考稿不再挂「AI 估算」徽标，只标「参考估算」）。
  const budgetCard = page.getByTestId('ai-budget-card');
  await expect(budgetCard).toContainText('交通');
  await expect(budgetCard).toContainText('80');
  await expect(budgetCard).toContainText('门票');
  await expect(budgetCard).toContainText('150');
  await expect(budgetCard).toContainText('餐饮');
  await expect(budgetCard).toContainText('180');
  await expect(budgetCard).toContainText('其他');
  await expect(budgetCard).toContainText('460');
  await expect(budgetCard).toContainText('参考估算');

  // 统计：距离 / 时间 = 高德替身之和（3 段 × 2100 米 / 900 秒）+「预计」。
  const stats = page.getByTestId('ai-stats');
  await expect(stats).toContainText('预计');
  await expect(stats).toContainText('6.3 公里');
  await expect(stats).toContainText('45 分钟');

  // 地图编号 Marker 与列表顺序一致（stub 绕过 JS Key，CI 恒跑）。
  expect(await mapStopNumbers(page)).toEqual(['1', '2', '3', '4']);
  expect(await routeCallCount(page)).toBe(3);
});

/* ---------- A4 编号与未定位（E17/E19） ---------- */

test('A4 keeps list numbering and flags unresolved POIs without fake coordinates', async ({ page }) => {
  state.plan = 'unresolved';
  await fillRequired(page);
  await generate(page);

  expect(await stopNames(page)).toEqual(['广州塔', '神秘景点', '花城广场', '北京路步行街']);
  const unresolvedRow = page.getByTestId('ai-stop').filter({ hasText: '神秘景点' });
  await expect(unresolvedRow).toContainText('未定位');
  await expect(unresolvedRow.getByRole('button', { name: '更换 神秘景点' })).toBeVisible();

  // 未定位 POI 不渲染 Marker，但保留列表序号：地图编号 1 / 3 / 4。
  expect(await mapStopNumbers(page)).toEqual(['1', '3', '4']);

  // 路线按已解析子集（3 点 → 2 段 = 4200 米 / 1800 秒）。
  await expect(page.getByTestId('ai-stats')).toContainText('4.2 公里');
  await expect(page.getByTestId('ai-stats')).toContainText('30 分钟');
  expect(await routeCallCount(page)).toBe(2);
});

/* ---------- A5 雨天 / 高温 / 低温（E13/E14/E15） ---------- */

test('A5 weather drives indoor preference and packing advice', async ({ page }) => {
  await fillRequired(page);

  // 雨天：室内占比更高 + 雨伞类 Tips。
  state.plan = 'rainy';
  state.weather = 'rainy';
  await generate(page);
  const indoorCount = await page.locator('[data-testid="ai-stop"][data-indoor="true"]').count();
  expect(indoorCount).toBeGreaterThanOrEqual(2);
  await expect(page.getByTestId('ai-tips')).toContainText('雨伞');
  await expect(page.getByTestId('ai-packing')).toContainText('防水鞋');
  await expect(page.getByTestId('ai-weather-card')).toContainText('80%');
  await expect(page.getByTestId('ai-weather-card')).toContainText('小雨');

  // 高温：防晒 / 帽子 / 水。
  state.plan = 'hot';
  state.weather = 'hot';
  await page.getByTestId('ai-regenerate').click();
  await expect(page.getByTestId('ai-tips')).toContainText('防晒');
  await expect(page.getByTestId('ai-packing')).toContainText('帽子');
  await expect(page.getByTestId('ai-packing')).toContainText('饮用水');
  await expect(page.getByTestId('ai-weather-card')).toContainText('35');

  // 低温：外套 / 温差。
  state.plan = 'cold';
  state.weather = 'cold';
  await page.getByTestId('ai-regenerate').click();
  await expect(page.getByTestId('ai-tips')).toContainText('外套');
  await expect(page.getByTestId('ai-tips')).toContainText('温差');
  await expect(page.getByTestId('ai-weather-card')).toContainText('8');
});

/* ---------- A6 编辑重算（E20–E23） ---------- */

test('A6 recomputes the route after remove, replace and reorder', async ({ page }) => {
  await fillRequired(page);
  await generate(page);
  expect(await routeCallCount(page)).toBe(3);

  // 删除第 2 个 → 3 点重编号 → 重算。
  await page.getByRole('button', { name: '删除 海心沙' }).click();
  expect(await stopNames(page)).toEqual(['广州塔', '花城广场', '北京路步行街']);
  await expect(page.getByTestId('ai-stats')).toContainText('4.2 公里');
  expect(await mapStopNumbers(page)).toEqual(['1', '2', '3']);
  expect(await routeCallCount(page)).toBe(5);

  // 更换第 2 个为「永庆坊」：顺序不变，新 POI 解析。
  await page.getByRole('button', { name: '更换 花城广场' }).click();
  const replaceInput = page.getByTestId('ai-replace-search').locator('input').first();
  await replaceInput.fill('永庆坊');
  await page.getByTestId('ai-replace-search').locator('.amap-search-item', { hasText: '永庆坊' }).first().waitFor();
  await replaceInput.press('Enter');
  expect(await stopNames(page)).toEqual(['广州塔', '永庆坊', '北京路步行街']);
  await expect(page.getByTestId('ai-stats')).toContainText('4.2 公里');
  expect(await routeCallCount(page)).toBe(7);

  // 上移末位 → 广州塔 / 北京路步行街 / 永庆坊，编号同步。
  await page.getByRole('button', { name: '上移 北京路步行街' }).click();
  expect(await stopNames(page)).toEqual(['广州塔', '北京路步行街', '永庆坊']);
  expect(await mapStopNumbers(page)).toEqual(['1', '2', '3']);
  expect(await routeCallCount(page)).toBe(9);
});

/* ---------- A7 不足两个（E24） ---------- */

test('A7 blocks saving when fewer than two stops remain', async ({ page }) => {
  await fillRequired(page);
  await generate(page);

  await page.getByRole('button', { name: '删除 海心沙' }).click();
  await page.getByRole('button', { name: '删除 花城广场' }).click();
  await page.getByRole('button', { name: '删除 北京路步行街' }).click();

  expect(await stopNames(page)).toEqual(['广州塔']);
  await expect(page.getByText('至少保留 2 个景点')).toBeVisible();
  await expect(page.getByTestId('ai-save')).toBeDisabled();
});

/* ---------- A8 超预算与降预算（E26/E27） ---------- */

test('A8 shows the over-budget gap and reduces budget on demand', async ({ page }) => {
  state.plan = 'overBudget';
  await fillRequired(page);
  await page.getByTestId('ai-budget').locator('input').fill('500');
  await generate(page);

  await expect(page.getByTestId('ai-budget-card')).toContainText('预计超过预算 80 元');
  await page.getByRole('button', { name: 'AI 帮我降低预算' }).click();
  await expect(page.getByTestId('ai-budget-card')).toContainText('370');
  await expect(page.getByTestId('ai-budget-card')).not.toContainText('预计超过预算');
  const lastRequest = state.aiRequests[state.aiRequests.length - 1] as any;
  expect(lastRequest.reduce_budget).toBe(true);
  expect(lastRequest.budget_cents).toBe(50000);

  // 未填预算档：不提示超支、无降预算按钮，估算仍展示。
  await page.getByTestId('ai-budget').locator('input').fill('');
  await page.getByTestId('ai-regenerate').click();
  await expect(page.getByTestId('ai-budget-card')).toContainText('580');
  await expect(page.getByTestId('ai-budget-card')).toContainText('AI 估算');
  await expect(page.getByTestId('ai-budget-card')).not.toContainText('预计超过预算');
  await expect(page.getByRole('button', { name: 'AI 帮我降低预算' })).toHaveCount(0);
});

/* ---------- A9 重新生成（E8） ---------- */

test('A9 regenerates with the current conditions', async ({ page }) => {
  await fillRequired(page);
  await generate(page);

  await pickSelect(page, 'ai-interests', '自然');
  await page.keyboard.press('Escape');
  await page.getByTestId('ai-pace').getByText('宽松', { exact: true }).click();
  state.plan = 'lowBudget';
  await page.getByTestId('ai-regenerate').click();
  await expect(page.getByTestId('ai-budget-card')).toContainText('370');

  const lastRequest = state.aiRequests[state.aiRequests.length - 1] as any;
  expect(lastRequest.interests).toEqual(['自然']);
  expect(lastRequest.pace).toBe('relaxed');
  expect(lastRequest.date).toBe(DAY);
  expect(lastRequest.destination).toEqual({ name: '广州市', lng: 113.264, lat: 23.129 });
});

/* ---------- A10 失败与重试（E10/E29–E32） ---------- */

test('A10 surfaces per-service errors with retry and never fabricates data', async ({ page }) => {
  // 天气失败档：预览 forecast 502 → 天气卡 Error+Retry。
  state.weatherStatus = 502;
  await fillRequired(page);
  await expect(page.getByTestId('ai-weather-retry')).toBeVisible();
  await expect(page.getByTestId('ai-weather-card')).toContainText('天气获取失败');
  state.weatherStatus = 200;
  await page.getByTestId('ai-weather-retry').click();
  await expect(page.getByTestId('ai-weather-card')).toContainText('24');

  // AI 502 档：Error+Retry，无伪造行程；恢复后重试成功。
  state.aiStatus = 502;
  await page.getByTestId('ai-generate').click();
  await expect(page.getByTestId('ai-error-retry')).toBeVisible();
  await expect(page.getByTestId('ai-stop')).toHaveCount(0);
  state.aiStatus = 200;
  await page.getByTestId('ai-error-retry').click();
  await expect(page.getByTestId('ai-stop').first()).toBeVisible();
  expect(await stopNames(page)).toHaveLength(4);

  // AI 503 档：未配置说明 + Retry。
  state.aiStatus = 503;
  await page.getByTestId('ai-regenerate').click();
  await expect(page.getByTestId('ai-error-retry')).toBeVisible();
  await expect(page.getByTestId('ai-error-retry').locator('..')).toContainText('尚未配置');
  state.aiStatus = 200;
  await page.getByTestId('ai-error-retry').click();
  await expect(page.getByTestId('ai-stop').first()).toBeVisible();

  // 高德路线失败档：地图区 Error+Retry，统计无伪造数值。
  await page.evaluate(() => { (window as any).__amapStubConfig.routeFail = true; });
  await page.getByTestId('ai-regenerate').click();
  await expect(page.getByTestId('ai-route-retry')).toBeVisible();
  await expect(page.getByTestId('ai-stats')).not.toContainText('公里');
  await page.evaluate(() => { (window as any).__amapStubConfig.routeFail = false; });
  await page.getByTestId('ai-route-retry').click();
  await expect(page.getByTestId('ai-stats')).toContainText('6.3 公里');
});

/* ---------- A11 保存闭环（E33/E37/E39/E40） ---------- */

test('A11 saves the snapshot, publishes it and shows the AI badge', async ({ page }) => {
  const title = '广州市 1 日游 · AI 推荐';
  await fillRequired(page);
  await page.getByTestId('ai-budget').locator('input').fill('500');
  await generate(page);
  await expect(page.getByTestId('ai-stats')).toContainText('6.3 公里');

  await page.getByTestId('ai-save').click();
  await expect(page).toHaveURL(/#\/trips\/new\?ai=\d+/);

  // 发布页预填（真实后端快照）。
  await expect(page.getByTestId('ai-prefill-banner')).toBeVisible();
  await expect(page.getByLabel('标题')).toHaveValue(title);
  await expect(page.getByLabel('出发日期')).toHaveValue(DAY);
  await expect(page.getByLabel('结束日期')).toHaveValue(DAY);
  for (const name of ['广州塔', '海心沙', '花城广场', '北京路步行街']) {
    await expect(page.locator('.place-chip-name', { hasText: name }).first()).toBeVisible();
  }
  await expect(page.locator('#trip-budget-min')).toHaveValue('460');
  await expect(page.locator('#trip-budget-max')).toHaveValue('460');

  await page.getByRole('button', { name: /^发\s*布$/ }).click();
  await expect(page).toHaveURL(/#\/trips\/\d+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('招募中').first()).toBeVisible();

  // 详情页：AI 来源徽标 + 天气 / 预算摘要（加性渲染）。
  await expect(page.getByTestId('ai-source-badge')).toContainText('AI 推荐');
  const summary = page.getByTestId('ai-summary');
  await expect(summary).toContainText('24');
  await expect(summary).toContainText('多云');
  await expect(summary).toContainText('460');
  await expect(summary).toContainText('AI 估算');

  // 首页可见（相对日期口径）。
  await page.goto('/');
  await expandPageSize(page);
  await expect(page.locator('.trip-card', { hasText: title })).toBeVisible();
});

/* ---------- A12 链接归属（E38，L-01 失败语义） ---------- */

test('A12 rejects another user\'s snapshot link and keeps the snapshot retryable', async ({ page }) => {
  // 用户 1 通过真实后端保存快照。
  const snapshotResponse = await page.request.post(`${API}/ai/itineraries`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      origin: { name: '广州南站', lng: 113.269, lat: 22.989 },
      destination: { name: '广州市', lng: 113.264, lat: 23.129 },
      date: DAY,
      duration: 'one_day',
      travel_mode: 'transit',
      interests: ['美食'],
      pace: 'moderate',
      budget_cents: 50000,
      stops: [
        { name: '广州塔', lng: 113.3245, lat: 23.1064, order: 1, reason: '城市地标', arrival: '09:00', stay_minutes: 120, indoor: false, resolved: true },
        { name: '海心沙', lng: 113.3217, lat: 23.1104, order: 2, reason: '江景开阔', arrival: '11:30', stay_minutes: 60, indoor: false, resolved: true },
      ],
      route: {
        mode: 'transit', distance_meters: 2100, duration_seconds: 900,
        legs: [{ from_id: 'poi-广州塔', to_id: 'poi-海心沙', distance_meters: 2100, duration_seconds: 900 }],
      },
      weather: weatherFixture('default', DAY),
      tips: ['当天紫外线较强，注意防晒'],
      packing: ['防晒霜', '帽子', '饮用水'],
      ai_budget: BUDGET_460,
    },
  });
  expect(snapshotResponse.ok()).toBeTruthy();
  const { id } = (await snapshotResponse.json()) as { id: number };

  // 用户 2 直接访问链接：预填失败可读提示，表单仍可手动填写。
  // hash 导航不触发 reload，须 switchUser 重载页面让 initScript 生效。
  await page.goto(`/#/trips/new?ai=${id}`);
  await switchUser(page, 2);
  await expect(page.getByTestId('ai-prefill-error')).toBeVisible();
  await expect(page.getByLabel('标题')).toBeVisible();

  const title = `E2E AI 归属 ${Date.now()}`;
  await page.getByLabel('标题').fill(title);
  await pickDestination(page, '广东省', '珠海市');
  await pickPlace(page, '途经点', '香洲港');
  await pickPlace(page, '途经点', '情侣路');
  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  // 提交被后端拒绝（400），错误可读，URL 保留 ?ai= 可重试。
  await expect(page.getByRole('alert').filter({ hasText: 'AI 行程' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#/trips/new\\?ai=${id}`));

  // 快照保留：用户 1 仍可读取（L-01 两段式失败语义）。
  const keepResponse = await page.request.get(`${API}/ai/itineraries/${id}`, {
    headers: { 'X-User-Id': '1' },
  });
  expect(keepResponse.ok()).toBeTruthy();
});