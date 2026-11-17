import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { isoDaysFromToday } from './support';

/**
 * 天气卡人工走查证据：1440 / 768 / 390，各截一张发布页侧栏。
 * 天气接口用固定响应注入，保证截图与真实网络无关；同时断言页面无横向溢出。
 * 产物写入 `ai4se-baseline/docs/preview/weather-create-<宽>-light.png`。
 */

const VIEWPORTS = [
  { width: 1440, height: 1100 },
  { width: 768, height: 1100 },
  { width: 390, height: 1100 },
];

function readyForecast(date: string): Record<string, unknown> {
  return {
    date,
    destination_code: '440100',
    city: '广州市',
    lng: 113.2644,
    lat: 23.1291,
    available: true,
    reason: null,
    weather: {
      weather_code: 61,
      weather_text: '小雨',
      temp_max_c: 33,
      temp_min_c: 9,
      precipitation_probability_pct: 80,
      precipitation_mm: 5.2,
      wind_speed_kmh: 32,
      uv_index: 8,
    },
    reminders: [
      { code: 'rain', text: '降雨概率 80%，记得带伞和雨具，户外行程注意防雨。降雨明显，建议调整户外行程。' },
      { code: 'heat', text: '最高 33°C，注意防晒并及时补水。' },
      { code: 'uv', text: '紫外线指数 8，较强，建议涂防晒霜、戴帽子和太阳镜。' },
      { code: 'cold', text: '最低 9°C，记得带件外套。' },
      { code: 'temperature_gap', text: '白天 33°C、夜间 9°C，昼夜温差 24°C，早晚注意加外套。' },
      { code: 'wind', text: '风速最大 32 km/h，注意防风，户外活动注意安全。' },
    ],
    source: 'open-meteo',
  };
}

async function prepare(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('routeme.currentUserId', '1');
  });
  const date = isoDaysFromToday(3);
  await page.route('**/api/weather/forecast**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(readyForecast(url.searchParams.get('date') ?? date)),
    });
  });
  await page.goto('/#/trips/new');
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('[data-area-province="440000"]').click();
  await page.locator('[data-area-city="440100"]').click();
  await expect(page.getByTestId('weather-ready')).toBeVisible();
}

test('天气卡在 1440 / 768 / 390 下不溢出', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await prepare(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `no horizontal overflow at ${viewport.width}`).toBeLessThanOrEqual(1);
    await page.getByTestId('weather-card').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'docs',
        'preview',
        `weather-create-${viewport.width}-light.png`,
      ),
      fullPage: false,
    });
  }
});