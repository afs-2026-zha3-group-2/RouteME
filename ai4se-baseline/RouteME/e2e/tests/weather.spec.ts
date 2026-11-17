import { expect, test, type Page } from '@playwright/test';
import { createTripViaApi, isoDaysFromToday, loginAs } from './support';

/**
 * 天气卡：全部用例用 page.route 注入 Open-Meteo 归一结果，不依赖真实上游与网络。
 * 断言只针对用户可见行为（数值、提醒、状态、重试与失败隔离）。
 */

type StubResult = { status?: number; body: unknown };

function readyForecast(date: string, city: string): Record<string, unknown> {
  return {
    date,
    destination_code: '440100',
    city,
    lng: 113.2644,
    lat: 23.1291,
    available: true,
    reason: null,
    weather: {
      weather_code: 61,
      weather_text: '小雨',
      temp_max_c: 24,
      temp_min_c: 17,
      precipitation_probability_pct: 80,
      precipitation_mm: 5.2,
      wind_speed_kmh: 18,
      uv_index: 3,
    },
    reminders: [
      {
        code: 'rain',
        text: '降雨概率 80%，记得带伞和雨具，户外行程注意防雨。降雨明显，建议调整户外行程。',
      },
    ],
    source: 'open-meteo',
  };
}

function unavailableForecast(date: string): Record<string, unknown> {
  return {
    date,
    destination_code: '440100',
    city: '广州市',
    lng: null,
    lat: null,
    available: false,
    reason: 'OUT_OF_RANGE',
    weather: null,
    reminders: [],
    source: 'open-meteo',
  };
}

/** 按需应答天气请求；responder 可读取 destination_code 与 date。 */
async function stubWeather(page: Page, responder: (url: URL) => StubResult) {
  await page.route('**/api/weather/forecast**', async (route) => {
    const url = new URL(route.request().url());
    const result = responder(url);
    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.body),
    });
  });
}

async function pickDestinationByCode(page: Page, provinceCode: string, cityCode: string) {
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator(`[data-area-province="${provinceCode}"]`).click();
  await page.locator(`[data-area-city="${cityCode}"]`).click();
}

async function setDate(page: Page, label: string, iso: string) {
  const input = page.getByLabel(label);
  await input.fill(iso);
  await input.press('Enter');
}

test('展示目的地首日天气与出行提醒', async ({ page }) => {
  await loginAs(page, 1);
  const date = isoDaysFromToday(3);
  await stubWeather(page, (url) => ({ body: readyForecast(url.searchParams.get('date') ?? date, '广州市') }));

  await page.goto('/#/trips/new');
  await pickDestinationByCode(page, '440000', '440100');
  await setDate(page, '出发日期', date);

  await expect(page.getByTestId('weather-ready')).toBeVisible();
  await expect(page.getByTestId('weather-card')).toContainText('17–24°C');
  await expect(page.getByTestId('weather-card')).toContainText('小雨');
  await expect(page.getByTestId('weather-card')).toContainText('80%');
  await expect(page.getByTestId('weather-card')).toContainText('Open-Meteo');
  await expect(page.getByTestId('weather-reminder').first()).toContainText('带伞');
});

test('修改目的地后刷新天气', async ({ page }) => {
  await loginAs(page, 1);
  await stubWeather(page, (url) => {
    const code = url.searchParams.get('destination_code');
    const city = code === '110100' ? '北京市' : '广州市';
    const text = code === '110100' ? '晴' : '小雨';
    const body = readyForecast(url.searchParams.get('date') ?? '', city);
    (body.weather as Record<string, unknown>).weather_text = text;
    return { body };
  });

  await page.goto('/#/trips/new');
  await pickDestinationByCode(page, '440000', '440100');
  await expect(page.getByTestId('weather-card')).toContainText('广州市');

  await pickDestinationByCode(page, '110000', '110100');
  await expect(page.getByTestId('weather-card')).toContainText('北京市');
  await expect(page.getByTestId('weather-card')).toContainText('晴');
  await expect(page.getByTestId('weather-card')).not.toContainText('广州市');
});

test('日期超出预报窗口时提示暂无预报', async ({ page }) => {
  await loginAs(page, 1);
  await stubWeather(page, (url) => ({ body: unavailableForecast(url.searchParams.get('date') ?? '') }));

  await page.goto('/#/trips/new');
  await pickDestinationByCode(page, '440000', '440100');

  await expect(page.getByTestId('weather-out-of-range')).toBeVisible();
  await expect(page.getByTestId('weather-card')).toContainText('暂无该日期天气预报');
  await expect(page.getByTestId('weather-ready')).toHaveCount(0);
});

test('失败时可重试且不阻断发布', async ({ page }) => {
  await loginAs(page, 1);
  let calls = 0;
  await stubWeather(page, (url) => {
    calls += 1;
    if (calls === 1) {
      return { status: 502, body: { code: 'WEATHER_UPSTREAM_ERROR' } };
    }
    return { body: readyForecast(url.searchParams.get('date') ?? '', '广州市') };
  });

  await page.goto('/#/trips/new');
  await pickDestinationByCode(page, '440000', '440100');

  await expect(page.getByTestId('weather-error')).toBeVisible();
  // antd 会在两个汉字的按钮文案中插入空格，按类名定位更稳：表单仍可提交。
  await expect(page.locator('.form-actions .ant-btn-primary')).toBeEnabled();

  await page.getByTestId('weather-retry').click();
  await expect(page.getByTestId('weather-ready')).toBeVisible();
});

test('未选择目的地时显示未就绪', async ({ page }) => {
  await loginAs(page, 1);
  await stubWeather(page, (url) => ({ body: readyForecast(url.searchParams.get('date') ?? '', '广州市') }));

  await page.goto('/#/trips/new');
  await expect(page.getByTestId('weather-idle')).toBeVisible();
  await expect(page.getByTestId('weather-ready')).toHaveCount(0);
});

test('详情页展示行程首日天气', async ({ page }) => {
  await loginAs(page, 1);
  const trip = await createTripViaApi(page, 1, `天气详情用例 ${Date.now()}`, { daysFromToday: 3 });
  const date = isoDaysFromToday(3);
  await stubWeather(page, () => ({ body: readyForecast(date, '珠海市') }));

  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByTestId('weather-ready')).toBeVisible();
  await expect(page.getByTestId('weather-card')).toContainText('珠海市');
  await expect(page.getByTestId('weather-reminder').first()).toBeVisible();
});

test('详情页天气失败不影响行程信息', async ({ page }) => {
  await loginAs(page, 1);
  const title = `天气失败隔离 ${Date.now()}`;
  const trip = await createTripViaApi(page, 1, title, { daysFromToday: 3 });
  await stubWeather(page, () => ({ status: 502, body: { code: 'WEATHER_UPSTREAM_ERROR' } }));

  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByTestId('weather-error')).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});