import { expect, test, type Page } from '@playwright/test';

/**
 * refine-trip-map R2：三级旅行地图探索（atdd E11–E18）。
 * 中国 → 省 → 城市为独立组件切换（URL 权威），Zoom 不换层；
 * 路线/统计/同行者百分比全部由数据模型计算，UI 不硬编码。
 */

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

/** 点 pin → 信息卡 → 加入路线（命中圆重叠，用事件派发避免拦截）。 */
async function addPoi(page: Page, poiId: string) {
  const map = page.locator('[data-testid="city-map"]').first();
  await map.locator(`[data-poi-id="${poiId}"]`).dispatchEvent('click');
  await page.locator('.map-callout').getByRole('button', { name: '加入路线' }).click();
}

const DEMO_ROUTE = ['广州-广州塔', '广州-海心沙', '广州-花城广场', '广州-北京路'];

async function generateDemoRoute(page: Page) {
  await page.goto('/#/map/440000/440100');
  const map = page.locator('[data-testid="city-map"]');
  await expect(map).toHaveAttribute('data-city', '440100');
  await expect(map.locator('[data-poi-id="广州-广州塔"]')).toBeVisible();
  for (const poiId of DEMO_ROUTE) {
    await addPoi(page, poiId);
  }
  const generate = page.locator('[data-testid="route-generate"]');
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.locator('[data-layer="route"]')).toBeVisible();
}

test('E11 three-level switching renders independent maps with six layers', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/map');

  const china = page.locator('[data-testid="china-map"]');
  await expect(china).toBeVisible();
  await expect(china.locator('[data-province-code]')).toHaveCount(34);
  // 中国层不显示景点/路线/同行者。
  await expect(page.locator('[data-layer="poi"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="traveler-bubble"]')).toHaveCount(0);

  await china.locator('[data-province-code="440000"]').dispatchEvent('click');
  await expect(page).toHaveURL(/#\/map\/440000$/);
  const province = page.locator('[data-testid="province-map"]');
  await expect(province).toBeVisible();
  await expect(province.locator('[data-city-name="广州"]')).toBeVisible();
  await expect(province.locator('[data-city-name="深圳"]')).toBeVisible();
  // 省级地图 MUST NOT 出现城市间连线。
  await expect(province.locator('line')).toHaveCount(0);

  await province.locator('[data-city-name="广州"]').dispatchEvent('click');
  await expect(page).toHaveURL(/#\/map\/440000\/440100$/);
  const city = page.locator('[data-testid="city-map"]');
  await expect(city).toBeVisible();
  for (const layer of ['road', 'water', 'park', 'poi']) {
    await expect(city.locator(`[data-layer="${layer}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-testid="map-breadcrumbs"]')).toContainText('中国');
  await expect(page.locator('[data-testid="map-breadcrumbs"]')).toContainText('广东省');
  await expect(page.locator('[data-testid="map-breadcrumbs"]')).toContainText('广州市');
});

test('E12 search jumps straight to a city or province level', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/map');

  const search = page.locator('[data-testid="china-map-search"]');
  await search.fill('广州');
  await page.locator('.place-suggest-item', { hasText: '广州' }).first().click();
  await expect(page).toHaveURL(/#\/map\/440000\/440100$/);
  await expect(page.locator('[data-testid="city-map"]')).toHaveAttribute('data-city', '440100');

  await page.goto('/#/map');
  await search.fill('广东');
  await page.locator('.place-suggest-item', { hasText: '广东' }).first().click();
  await expect(page).toHaveURL(/#\/map\/440000$/);
  await expect(page.locator('[data-testid="province-map"]')).toBeVisible();
});

test('E13 breadcrumbs go back a level and zoom never changes the level', async ({ page }) => {
  await loginAs(page, 1);
  await generateDemoRoute(page);

  const map = page.locator('[data-testid="city-map"]');
  const before = await map.getAttribute('viewBox');
  await page.getByRole('button', { name: '放大地图' }).click();
  await expect.poll(async () => map.getAttribute('viewBox')).not.toBe(before);
  await page.getByRole('button', { name: '缩小地图' }).click();
  // 滚轮缩放同样只改 viewBox。
  await map.dispatchEvent('wheel', { deltaY: -120, clientX: 300, clientY: 200 });
  await expect(page).toHaveURL(/#\/map\/440000\/440100$/);
  await expect(page.locator('[data-testid="city-map"]')).toBeVisible();

  await page.locator('[data-testid="map-breadcrumbs"]').getByRole('button', { name: '广东省' }).click();
  await expect(page).toHaveURL(/#\/map\/440000$/);
  await expect(page.locator('[data-testid="province-map"]')).toBeVisible();

  await page.locator('[data-testid="map-breadcrumbs"]').getByRole('button', { name: '中国' }).click();
  await expect(page).toHaveURL(/#\/map$/);
  await expect(page.locator('[data-testid="china-map"]')).toBeVisible();
});

test('E14 route generation syncs numbered pins, stats and the itinerary list', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/map/440000/440100');
  await expect(page.locator('[data-poi-id="广州-广州塔"]')).toBeVisible();

  // 少于两个景点不能生成。
  await addPoi(page, '广州-广州塔');
  await expect(page.locator('[data-testid="route-generate"]')).toBeDisabled();
  await expect(page.getByText('至少选择两个景点后才能生成路线。')).toBeVisible();

  for (const poiId of DEMO_ROUTE.slice(1)) {
    await addPoi(page, poiId);
  }
  await page.locator('[data-testid="route-generate"]').click();

  const map = page.locator('[data-testid="city-map"]');
  await expect(map.locator('[data-layer="route"]')).toBeVisible();
  await expect(map.locator('.map-route-badge text')).toHaveText(['1', '2', '3', '4']);
  await expect(map.locator('.map-route-line')).toHaveAttribute('stroke', /^url\(/);
  // pin 的 DOM 顺序随索引表，编号按 pin 逐个断言。
  for (const [index, poiId] of DEMO_ROUTE.entries()) {
    await expect(map.locator(`[data-poi-id="${poiId}"] .map-selected-index`)).toHaveText(String(index + 1));
  }

  const stats = page.locator('[data-testid="route-stats"]');
  await expect(stats).toContainText('景点数量');
  await expect(stats).toContainText('预计距离');
  await expect(stats).toContainText('预计时间');
  await expect(stats).toContainText('km');

  const items = page.locator('.itinerary-name');
  await expect(items).toHaveText(['广州塔', '海心沙', '花城广场', '北京路']);

  // 点击列表第 3 项 → 地图聚焦花城广场 pin。
  const before = await map.getAttribute('viewBox');
  await page.locator('.itinerary-item-main').nth(2).click();
  await expect.poll(async () => map.getAttribute('viewBox')).not.toBe(before);
  await expect(page.locator('.itinerary-item.focused .itinerary-name')).toHaveText('花城广场');
});

test('E15 removing a stop renumbers pins and updates the stats instantly', async ({ page }) => {
  await loginAs(page, 1);
  await generateDemoRoute(page);

  await page.getByRole('button', { name: '移除 海心沙' }).click();
  const map = page.locator('[data-testid="city-map"]');
  await expect(map.locator('[data-poi-id="广州-广州塔"] .map-selected-index')).toHaveText('1');
  await expect(map.locator('[data-poi-id="广州-花城广场"] .map-selected-index')).toHaveText('2');
  await expect(map.locator('[data-poi-id="广州-北京路"] .map-selected-index')).toHaveText('3');
  await expect(map.locator('[data-poi-id="广州-海心沙"] .map-selected-index')).toHaveCount(0);
  await expect(map.locator('.map-route-badge text')).toHaveText(['1', '2', '3']);
  await expect(page.locator('.itinerary-name')).toHaveText(['广州塔', '花城广场', '北京路']);
  const stats = page.locator('[data-testid="route-stats"]');
  await expect(stats.locator('.route-stats-item').first()).toContainText('3');
});

test('E16 traveler bubble and panel are data-driven with real profile/invite links', async ({ page }) => {
  await loginAs(page, 1);
  await generateDemoRoute(page);

  // 75% = 3/4 共同景点，由 travelerMatch 纯函数计算（非组件常量）。
  const bubble = page.locator('[data-testid="traveler-bubble"]');
  await expect(bubble).toContainText('75% 同路');
  await expect(bubble).toContainText('3 位同行者');
  await bubble.click();

  const panel = page.locator('[data-testid="traveler-panel"]');
  await expect(panel).toBeVisible();
  const cards = panel.locator('.traveler-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.locator('.traveler-match')).toHaveText(['75% 同路', '75% 同路', '25% 同路']);
  await expect(cards.nth(1).locator('.traveler-shared-tag')).toHaveText(['广州塔', '海心沙', '花城广场']);
  await expect(cards.nth(1)).toContainText('旅行日期');
  await expect(cards.nth(1).locator('.traveler-tags .ant-tag')).not.toHaveCount(0);

  // 查看资料 → 真实用户资料页（林见夏 userId 1）。
  await cards.nth(1).getByRole('button', { name: '查看资料' }).click();
  await expect(page).toHaveURL(/#\/users\/1$/);

  // 发起同行邀请 → 苏念的真实行程 4 详情申请入口（探索状态随路由重置，重新生成路线）。
  await generateDemoRoute(page);
  await page.locator('[data-testid="traveler-open"]').click();
  const sunian = page.locator('.traveler-card', { hasText: '苏念' });
  await sunian.getByRole('button', { name: '发起同行邀请' }).click();
  await expect(page).toHaveURL(/#\/trips\/4$/);
  await expect(page.getByRole('heading', { name: '广州老城骑楼扫街半日' })).toBeVisible();

  // 无真实行程的演示同行者 → 演示提示，不伪造发送成功。
  await generateDemoRoute(page);
  await page.locator('[data-testid="traveler-open"]').click();
  const azhe = page.locator('.traveler-card', { hasText: '阿哲' });
  await azhe.getByRole('button', { name: '发起同行邀请' }).click();
  await expect(page.locator('.ant-message')).toContainText('演示同行者');
  await expect(page).toHaveURL(/#\/map\/440000\/440100$/);
});

test('E17 uncovered city shows the unified fallback without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await loginAs(page, 1);
  await page.goto('/#/map/540000/540100');

  await expect(page.locator('.map-fallback')).toContainText('该城市详细旅行地图正在完善');
  await expect(page.locator('[data-testid="city-map"]')).toHaveAttribute('data-city', '540100');
  const crumbs = page.locator('[data-testid="map-breadcrumbs"]');
  await expect(crumbs).toContainText('西藏自治区');
  await expect(crumbs).toContainText('拉萨市');
  await crumbs.getByRole('button', { name: '西藏自治区' }).click();
  await expect(page.locator('[data-testid="province-map"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('E18 publish cascade writes the destination and keeps the stop limit', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  const china = page.locator('.place-picker [data-testid="china-map"]').first();
  await expect(china).toBeVisible();
  await china.locator('[data-province-code="440000"]').dispatchEvent('click');
  await page.locator('.place-picker [data-city-name="珠海"]').dispatchEvent('click');
  // 目的地回写后两个 picker（途经点/集合）都会挂城市地图，取第一个。
  const map = page.locator('.place-picker [data-testid="city-map"]').first();
  await expect(map).toHaveAttribute('data-city', '440400');
  await expect(page.locator('#trip-destination')).toContainText('珠海');

  // 地图连加两个途经点，编号水滴按序。
  await map.locator('[data-poi-id="珠海-香洲港"]').dispatchEvent('click');
  await page.locator('.map-callout').getByRole('button', { name: '加入路线' }).click();
  await map.locator('[data-poi-id="珠海-情侣路"]').dispatchEvent('click');
  await page.locator('.map-callout').getByRole('button', { name: '加入路线' }).click();
  await expect(page.locator('.place-chip-name')).toHaveCount(2);
  await expect(map.locator('.map-selected-index').first()).toHaveText('1');
});

test('E18 detail keeps the read-only city map and degrades for uncovered cities', async ({ page }) => {
  await loginAs(page, 1);
  // 广州行程：只读 city-map＋渐变路线＋行程条聚焦保留。
  await page.goto('/#/trips/4');
  const section = page.locator('.detail-map-section');
  await expect(section.locator('[data-testid="city-map"]')).toHaveAttribute('data-city', '440100');
  await expect(section.locator('.route-strip-card')).toHaveCount(5);
  await expect(section.locator('[data-testid="route-generate"]')).toHaveCount(0);

  // 拉萨目的地：无离线点位 → 文本降级（不白屏不报错）。
  const created = await page.request.post('/api/trips', {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title: `E2E 拉萨降级 ${Date.now()}`,
      destination_code: '540100',
      start_date: '2026-11-20',
      end_date: '2026-11-20',
      stops: ['布达拉宫', '大昭寺'],
      tags: ['历史'],
      capacity: 3,
      meeting_areas: null,
      meeting_time: null,
    },
  });
  expect(created.ok()).toBeTruthy();
  const trip = (await created.json()) as { id: number };
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.locator('.detail-map-section')).toHaveCount(0);
  await expect(page.locator('.detail-stops')).toContainText('布达拉宫');
});