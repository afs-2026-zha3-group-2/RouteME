import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { isoDaysFromToday } from './support';
import { installAmapStub } from './support/amapStub';

/**
 * 发布页路线编辑器人工走查证据：1440 / 768 / 390 × 明暗双主题，共 6 张。
 * 高德侧用共享替身（`support/amapStub.ts`），天气用固定响应，截图与真实网络无关；
 * 每档同时断言无横向溢出。产物写入
 * `ai4se-baseline/docs/preview/refine-publish-route-map/publish-route-<宽>-<主题>.png`。
 */

const VIEWPORTS = [
  { width: 1440, height: 1100 },
  { width: 768, height: 1100 },
  { width: 390, height: 1100 },
];

const OUT_DIR = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'docs',
  'preview',
  'refine-publish-route-map',
);

function readyForecast(date: string): Record<string, unknown> {
  return {
    date,
    destination_code: '440400',
    city: '珠海市',
    lng: 113.5767,
    lat: 22.2859,
    available: true,
    reason: null,
    weather: {
      weather_code: 1,
      weather_text: '晴',
      temp_max_c: 26,
      temp_min_c: 19,
      precipitation_probability_pct: 10,
      precipitation_mm: 0,
      wind_speed_kmh: 14,
      uv_index: 5,
    },
    reminders: [{ code: 'uv', text: '紫外线指数 5，外出建议涂防晒霜。' }],
    source: 'open-meteo',
  };
}

async function addStop(page: Page, name: string) {
  const editor = page.locator('.publish-route-editor');
  await editor.locator('#trip-stops').fill(name);
  const option = editor.locator('.amap-search-item').filter({ hasText: name }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(editor.locator('.amap-waypoint-text b').filter({ hasText: name }).first()).toBeVisible();
}

async function prepare(page: Page) {
  const date = isoDaysFromToday(7);
  await page.route('**/api/weather/forecast**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(readyForecast(url.searchParams.get('date') ?? date)),
    });
  });
  await page.goto('/#/trips/new');
  await expect(page.locator('.publish-route-editor')).toBeVisible();

  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('[data-area-province="440000"]').click();
  await page.locator('[data-area-city="440400"]').click();
  await expect(page.locator('#trip-destination')).toContainText('珠海市');

  await addStop(page, '香洲港');
  await addStop(page, '情侣路');
  await page.locator('.publish-route-editor [data-testid="amap-route-generate"]').click();
  await expect(page.locator('[data-testid="amap-route-stats"]')).toBeVisible();
  await page.locator('.publish-route-editor').scrollIntoViewIfNeeded();
}

test('发布页路线编辑器三档视口 × 双主题', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await installAmapStub(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('routeme.currentUserId', '1');
  });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await prepare(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `no horizontal overflow at ${viewport.width}`).toBeLessThanOrEqual(1);

    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await expect(page.locator('.publish-route-editor')).toBeVisible();
      await page.locator('.publish-route-editor').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(OUT_DIR, `publish-route-${viewport.width}-${theme}.png`),
        fullPage: false,
      });
    }
  }
});