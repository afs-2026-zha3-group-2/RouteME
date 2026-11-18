/**
 * 发布页路线编辑器 E2E（refine-publish-route-map，ATDD #8–#18 + 导航约束 AC-7）。
 *
 * 替身口径：高德侧统一用 `window.AMap` 替身（`support/amapStub.ts`），与
 * `ai-planner.spec.ts` 共用；发布 / 详情走真实后端。断言只用语义化选择器与
 * 结构锚点（`.amap-route-svg path` / `.amap-stop-number`），不使用 `waitForTimeout`。
 */
import { expect, test, type Page } from '@playwright/test';
import { isoDaysFromToday, loginAs } from './support';
import { clickMapAt, installAmapStub, setAmapRouteFail } from './support/amapStub';

const EDITOR = '.publish-route-editor';
const MAP_HOST = '.publish-route-canvas .amap-canvas-host';
const PANEL = '[data-testid="waypoint-panel"]';
const STATS = '[data-testid="amap-route-stats"]';
const ITINERARY = '[data-testid="amap-itinerary-panel"]';

test.beforeEach(async ({ page }) => {
  await installAmapStub(page);
  await loginAs(page, 1);
});

function waypointNames(page: Page) {
  return page.locator(`${EDITOR} .amap-waypoint-text b`);
}

async function openEditor(page: Page) {
  await page.goto('/#/trips/new');
  await expect(page.locator(EDITOR)).toBeVisible();
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('[data-area-province="440000"]').click();
  await page.locator('[data-area-city="440400"]').click();
  await expect(page.locator('.area-trigger').first()).toContainText('珠海市');
}

/** 用编辑器内的关键字搜索加一个途经点（搜索有 320ms 防抖）。 */
async function addStop(page: Page, name: string) {
  const editor = page.locator(EDITOR);
  await editor.locator('#trip-stops').fill(name);
  const option = editor.locator('.amap-search-item').filter({ hasText: name }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(editor.locator('.amap-waypoint-text b').filter({ hasText: name }).first()).toBeVisible();
}

async function generateRoute(page: Page) {
  await page.locator(`${EDITOR} [data-testid="amap-route-generate"]`).click();
}

async function publish(page: Page, title: string) {
  await page.getByLabel('标题').fill(title);
  await page.getByRole('button', { name: /^发\s*布/ }).click();
}

async function createTripWithStops(page: Page, title: string, stops: string[]) {
  const response = await page.request.post('/api/trips', {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: isoDaysFromToday(7),
      end_date: isoDaysFromToday(7),
      stops,
      tags: ['摄影'],
      capacity: 3,
      meeting_areas: null,
      meeting_time: null,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

test('adds stops on the map and draws the generated route', async ({ page }) => {
  await openEditor(page);
  await addStop(page, '香洲港');

  // 地图点选：逆地理拿不到可读名称时必须先命名，不能把坐标占位名带进路线。
  await clickMapAt(page, 113.5767, 22.2759, MAP_HOST);
  await page.getByRole('button', { name: '使用该位置' }).click();
  const nameDialog = page.locator('[data-testid="publish-stop-name-dialog"]');
  await expect(nameDialog).toBeVisible();
  await nameDialog.getByLabel('途经点名称').fill('情侣中路海堤');
  // 弹窗页脚在 body 里、不在 testid 容器内。
  await page.getByRole('button', { name: '加入途经点' }).click();
  await expect(nameDialog).toBeHidden();

  await expect(waypointNames(page)).toHaveText(['香洲港', '情侣中路海堤']);

  await generateRoute(page);
  const stats = page.locator(STATS);
  await expect(stats).toBeVisible();
  // 替身每段 2100 米 / 900 秒（公共交通）：2 个途经点 = 1 段。
  await expect(stats).toContainText('2.1 公里');
  await expect(stats).toContainText('15 分钟');
  await expect(page.locator(`${EDITOR} .amap-stop-number`)).toHaveText(['1', '2']);
  await expect(page.locator(`${EDITOR} .amap-stop-tag`)).toHaveText(['起', '终']);
  await expect(page.locator(`${EDITOR} .amap-route-svg path`)).toHaveCount(2);
  // 发布页不引入景点图钉层（Non-goal N5）。
  await expect(page.locator('.amap-scenic-toggle')).toHaveCount(0);
});

test('reorders stops and keeps the new order after publishing', async ({ page }) => {
  const title = `E2E 路线排序 ${Date.now()}`;
  await openEditor(page);
  await addStop(page, '香洲港');
  await addStop(page, '情侣路');
  await page.getByRole('button', { name: '下移 香洲港' }).click();
  await expect(waypointNames(page)).toHaveText(['情侣路', '香洲港']);
  await expect(page.locator(`${EDITOR} .amap-stop-number`)).toHaveText(['1', '2']);

  await generateRoute(page);
  await expect(page.locator(STATS)).toBeVisible();

  await publish(page, title);
  await expect(page).toHaveURL(/#\/trips\/\d+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.locator('.route-strip-name')).toHaveText(['情侣路', '香洲港']);
});

test('recalculates the route when the travel mode changes', async ({ page }) => {
  await openEditor(page);
  await addStop(page, '香洲港');
  await addStop(page, '情侣路');

  const modeRow = page.locator(`${EDITOR} .amap-mode-row`);
  await expect(modeRow).toContainText('自驾');
  await expect(modeRow).toContainText('骑行');
  await expect(modeRow).toContainText('公共交通');
  // 发布页只有三档；探索页的「步行 / 驾车」不得出现（Non-goal N3）。
  await expect(modeRow).not.toContainText('步行');
  await expect(modeRow).not.toContainText('驾车');

  await generateRoute(page);
  const stats = page.locator(STATS);
  const itinerary = page.locator(ITINERARY);
  await expect(stats).toContainText('15 分钟');
  await expect(itinerary).toContainText('公共交通');

  await modeRow.getByText('自驾', { exact: true }).click();
  await expect(stats).toContainText('10 分钟');
  await expect(itinerary).toContainText('自驾');

  await modeRow.getByText('骑行', { exact: true }).click();
  await expect(stats).toContainText('20 分钟');
  await expect(itinerary).toContainText('骑行');
});

test('plans transit inside the destination city', async ({ page }) => {
  await openEditor(page);
  await addStop(page, '香洲港');
  await addStop(page, '情侣路');
  await generateRoute(page);
  await expect(page.locator(STATS)).toBeVisible();

  const options = await page.evaluate(() => (window as any).__amapTransferOptions);
  expect(options?.city).toBe('珠海');
  expect(options?.policy).toBe(0);
});

test('falls back to straight segments when the route service fails', async ({ page }) => {
  await openEditor(page);
  await addStop(page, '香洲港');
  await addStop(page, '情侣路');
  await setAmapRouteFail(page, true);
  await generateRoute(page);

  await expect(page.locator(`${EDITOR} .amap-route-svg path[stroke-dasharray]`)).toHaveCount(2);
  await expect(page.getByText('已按直线显示路线')).toBeVisible();
  await expect(waypointNames(page)).toHaveText(['香洲港', '情侣路']);
  await expect(page.locator(`${EDITOR} .amap-container`)).toBeVisible();
});

test('keeps the fallback copy free of backend details', async ({ page }) => {
  await openEditor(page);
  await addStop(page, '香洲港');
  await addStop(page, '情侣路');
  await setAmapRouteFail(page, true);
  await generateRoute(page);

  const side = page.locator('.publish-route-side');
  // 近似提示在地图失败回调之后渲染，等它出现再读文案。
  await expect(side).toContainText('路线服务暂时不可用');
  const copy = await side.innerText();
  for (const word of ['后端', '端口', '代理', '重载', '8080', 'Key']) {
    expect(copy).not.toContain(word);
  }
});

test('submits stop names and the travel mode only', async ({ page }) => {
  const posted: Array<Record<string, unknown>> = [];
  await page.route('**/api/trips', async (route) => {
    if (route.request().method() === 'POST') {
      posted.push(route.request().postDataJSON() as Record<string, unknown>);
    }
    await route.continue();
  });

  const title = `E2E 请求体 ${Date.now()}`;
  await openEditor(page);
  await addStop(page, '香洲港');
  await addStop(page, '情侣路');
  await page.locator(`${EDITOR} .amap-mode-row`).getByText('自驾', { exact: true }).click();
  await publish(page, title);

  await expect(page).toHaveURL(/#\/trips\/\d+$/);
  expect(posted).toHaveLength(1);
  const body = posted[0];
  expect(body.title).toBe(title);
  expect(body.stops).toEqual(['香洲港', '情侣路']);
  expect(body.travel_mode).toBe('driving');
  // 反向守卫：请求体只有既有键，坐标 / 折线不得进入契约（Non-goal N1）。
  expect(Object.keys(body).some((key) => /coord|lng|lat|place|polyline|route/i.test(key))).toBe(false);
  expect(JSON.stringify(body.stops)).not.toMatch(/113\./);
});

test('blocks publishing when a stop is still a coordinate placeholder', async ({ page }) => {
  const created = await createTripWithStops(
    page,
    `E2E 占位名 ${Date.now()}`,
    ['地图选点 113.57670, 22.28590', '情侣路'],
  );
  await page.goto(`/#/trips/new?from=${created.id}`);

  // 等预填落库再改表单，避免 prefill 覆盖手填值。
  await expect(page.locator('.publish-route-unresolved')).toContainText(
    '地图选点 113.57670, 22.28590',
  );
  await expect(waypointNames(page)).toHaveText(['情侣路']);

  await page.getByLabel('标题').fill(`E2E 占位名 ${Date.now()}`);
  await page.getByRole('button', { name: /^发\s*布/ }).click();

  await expect(page.getByText('途经点不能是坐标占位名，请改为可识别的地名')).toBeVisible();
  await expect(page).toHaveURL(/#\/trips\/new/);
});

test('opens AI-prefilled stops in the same editable route editor', async ({ page }) => {
  const snapshot = {
    origin: { name: '广州塔', lng: 113.3245, lat: 23.1064 },
    destination: { name: '广州市', lng: 113.264, lat: 23.129 },
    date: isoDaysFromToday(7),
    duration: 'one_day',
    travel_mode: 'transit',
    interests: ['摄影'],
    pace: 'moderate',
    budget_cents: null,
    stops: ['广州塔', '北京路步行街', '永庆坊'].map((name, index) => ({
      name,
      reason: '顺路',
      arrival: '09:00',
      stay_minutes: 60,
      indoor: false,
      order: index + 1,
      resolved: true,
    })),
    route: null,
    weather: null,
    tips: [],
    packing: [],
    ai_budget: null,
  };
  await page.route('**/api/ai/itineraries/1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(snapshot),
    });
  });

  await page.goto('/#/trips/new?ai=1');
  await expect(page.locator(EDITOR)).toBeVisible();
  await expect(waypointNames(page)).toHaveText(['广州塔', '北京路步行街', '永庆坊']);

  await page.getByRole('button', { name: '上移 永庆坊' }).click();
  await expect(waypointNames(page)).toHaveText(['广州塔', '永庆坊', '北京路步行街']);

  await generateRoute(page);
  await expect(page.locator(STATS)).toBeVisible();
  await page.getByRole('button', { name: '移除 广州塔' }).click();
  await expect(waypointNames(page)).toHaveText(['永庆坊', '北京路步行街']);
  await expect(page.locator(STATS)).toBeVisible();
});

test('stops accepting new stops at the eight-stop limit', async ({ page }) => {
  test.setTimeout(90_000);
  await openEditor(page);
  const names = [
    '香洲港',
    '情侣路',
    '广州塔',
    '永庆坊',
    '海心沙',
    '花城广场',
    '北京路步行街',
    '广东省博物馆',
  ];
  for (const name of names) {
    await addStop(page, name);
  }
  await expect(page.locator(PANEL)).toContainText('8/8');

  await generateRoute(page);
  await expect(page.locator(STATS)).toBeVisible();
  const before = await page.locator(`${EDITOR} .amap-route-svg path`).first().getAttribute('d');
  const stopCount = await waypointNames(page).count();

  await page.locator(`${EDITOR} #trip-stops`).fill('广州南站');
  const option = page.locator(`${EDITOR} .amap-search-item`).filter({ hasText: '广州南站' }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByText('最多选择 8 个途经点')).toBeVisible();
  await expect(waypointNames(page)).toHaveCount(stopCount);
  // 已有路线不受被拒的第 9 个点影响。
  await expect(page.locator(`${EDITOR} .amap-route-svg path`).first()).toHaveAttribute('d', before);
});

test('keeps the route editor inside narrow viewports and both themes', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/#/trips/new');
  await expect(page.locator(EDITOR)).toBeVisible();

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px / ${theme}`).toBeLessThanOrEqual(1);
      await expect(page.locator(EDITOR)).toBeVisible();
      await expect(page.locator(`${EDITOR} .amap-container`)).toBeVisible();
      await expect(page.locator(PANEL)).toBeVisible();
      await expect(page.locator(ITINERARY)).toBeVisible();
    }
  }
});

test('removes the map nav entry but keeps deep links working', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.rail-nav')).toBeVisible();
  await expect(page.locator('.rail-nav')).not.toContainText('旅行地图');
  await expect(page.locator('.tabbar')).not.toContainText('旅行地图');
  // 其它入口保留，避免整组导航被误删。
  await expect(page.locator('.rail-nav')).toContainText('发布');
  await expect(page.locator('.rail-nav')).toContainText('AI 规划');

  for (const path of ['/#/map', '/#/map/440000', '/#/map/440000/440100']) {
    await page.goto(path);
    await expect(page.locator('.amap-explorer')).toBeVisible();
  }
});