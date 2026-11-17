import { expect, test, type Page } from '@playwright/test';
import { createTripViaApi, loginAs } from './support';

/**
 * 同行者推荐：全部用例用 page.route 注入推荐响应，
 * 断言只针对用户可见行为（分值、分项、空态、失败重试与切换行程）。
 */

type StubResult = { status?: number; body: unknown };

function user(id: number, nickname: string): Record<string, unknown> {
  return {
    id,
    nickname,
    avatar_initial: nickname.slice(0, 1),
    bio: '喜欢拍照，也喜欢慢慢走。',
    interests: ['摄影', '美食'],
    profile_complete: true,
  };
}

function trip(id: number, title: string): Record<string, unknown> {
  return {
    id,
    title,
    destination: '广州',
    destination_code: '440100',
    province_code: '440000',
    province_name: '广东省',
    start_date: '2026-11-20',
    end_date: '2026-11-20',
    stops: ['集合', '终点'],
    meeting_areas: [],
    meeting_time: null,
    travel_mode: 'transit',
    tags: ['摄影'],
    capacity: 4,
    joined_count: 1,
    status: 'recruiting',
    ending_soon: false,
    publisher: user(100, '候选发布者'),
    created_at: '2026-11-01T00:00:00Z',
  };
}

function payload(referenceTripId: number, score: number): Record<string, unknown> {
  return {
    reference: {
      trip_id: referenceTripId,
      destination: '广州',
      start_date: '2026-11-20',
      interests: ['摄影', '美食'],
    },
    items: [
      {
        user: user(101, '小林'),
        trip: trip(501, '广州骑楼扫街'),
        score,
        reasons: ['目的地相同 +50', '出发日期相同 +30', '共同兴趣摄影 +10'],
        breakdown: [
          { dimension: 'destination', label: '目的地相同', points: 50 },
          { dimension: 'date', label: '出发日期相同', points: 30 },
          { dimension: 'interest', label: '共同兴趣摄影', points: 10 },
        ],
        shared_interests: ['摄影'],
      },
    ],
  };
}

function emptyPayload(referenceTripId: number): Record<string, unknown> {
  return {
    reference: {
      trip_id: referenceTripId,
      destination: '广州',
      start_date: '2026-11-20',
      interests: ['摄影'],
    },
    items: [],
  };
}

async function stubRecommendations(
  page: Page,
  responder: (tripId: string, attempt: number) => StubResult,
) {
  const hits = new Map<string, number>();
  await page.route('**/api/trips/*/recommendations', async (route) => {
    const match = /trips\/(\d+)\/recommendations/.exec(route.request().url());
    const tripId = match?.[1] ?? '0';
    const attempt = (hits.get(tripId) ?? 0) + 1;
    hits.set(tripId, attempt);
    const result = responder(tripId, attempt);
    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.body),
    });
  });
  return hits;
}

test('展示推荐人、总分与分项明细', async ({ page }) => {
  await loginAs(page, 1);
  const created = await createTripViaApi(page, 1, '推荐展示行程');
  await stubRecommendations(page, (tripId) => ({ body: payload(Number(tripId), 90) }));

  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByTestId('recommendation-list')).toBeVisible();
  await expect(page.getByTestId('recommendation-row')).toHaveCount(1);
  await expect(page.getByTestId('recommendation-row').first()).toContainText('匹配度 90%');
  await expect(page.getByTestId('recommendation-row').first()).toContainText(
    '目的地和日期相同，并且都喜欢摄影',
  );
  await expect(page.getByTestId('recommendation-row').first()).toContainText('小林');

  const breakdown = page.getByTestId('recommendation-breakdown');
  await expect(breakdown).toBeVisible();
  await breakdown.getByText('查看匹配明细').click();
  await expect(breakdown).toContainText('目的地相同 +50');
  await expect(breakdown).toContainText('共同兴趣摄影 +10');
});

test('日期相差一天时使用准确文案且没有共同兴趣就不显示兴趣原因', async ({ page }) => {
  await loginAs(page, 1);
  const created = await createTripViaApi(page, 1, '推荐日期差一天行程');
  await stubRecommendations(page, (tripId) => ({
    body: {
      reference: {
        trip_id: Number(tripId),
        destination: '广州',
        start_date: '2026-11-20',
        interests: ['摄影'],
      },
      items: [
        {
          user: user(102, '阿岚'),
          trip: trip(502, '差一天出发'),
          score: 70,
          reasons: ['目的地相同 +50', '旅行日期相差 1 天 +20'],
          breakdown: [
            { dimension: 'destination', label: '目的地相同', points: 50 },
            { dimension: 'date', label: '旅行日期相差 1 天', points: 20 },
          ],
          shared_interests: [],
        },
      ],
    },
  }));

  await page.goto(`/#/trips/${created.id}`);

  const row = page.getByTestId('recommendation-row').first();
  await expect(row).toContainText('匹配度 70%');
  await expect(row).toContainText('目的地相同，旅行日期相差 1 天');
  await expect(row).not.toContainText('共同兴趣');
});

test('没有候选时显示明确空状态', async ({ page }) => {
  await loginAs(page, 1);
  const created = await createTripViaApi(page, 1, '推荐空态行程');
  await stubRecommendations(page, (tripId) => ({ body: emptyPayload(Number(tripId)) }));

  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByTestId('recommendation-empty')).toBeVisible();
  await expect(page.getByTestId('recommendation-empty')).toContainText('暂时没有合适的同行者');
  await expect(page.getByTestId('recommendation-row')).toHaveCount(0);
});

test('请求未返回时显示加载状态', async ({ page }) => {
  await loginAs(page, 1);
  const created = await createTripViaApi(page, 1, '推荐加载行程');
  await page.route('**/api/trips/*/recommendations', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const match = /trips\/(\d+)\/recommendations/.exec(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload(Number(match?.[1] ?? 0), 90)),
    });
  });

  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByTestId('recommendation-loading')).toBeVisible();
  await expect(page.getByTestId('recommendation-list')).toBeVisible();
});

test('推荐失败可重试且不影响行程信息', async ({ page }) => {
  await loginAs(page, 1);
  const created = await createTripViaApi(page, 1, '推荐失败行程');
  let recovered = false;
  await page.route('**/api/trips/*/recommendations', async (route) => {
    const match = /trips\/(\d+)\/recommendations/.exec(route.request().url());
    const tripId = Number(match?.[1] ?? 0);
    if (!recovered) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload(tripId, 90)),
    });
  });

  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByText('推荐加载失败')).toBeVisible();
  await expect(page.getByRole('heading', { name: '推荐失败行程' })).toBeVisible();

  recovered = true;
  await page.getByTestId('recommendation-retry').click();

  await expect(page.getByTestId('recommendation-list')).toBeVisible();
  await expect(page.getByTestId('recommendation-row').first()).toContainText('匹配度 90%');
});

test('分值完全来自后端而不是前端常量', async ({ page }) => {
  await loginAs(page, 1);
  const created = await createTripViaApi(page, 1, '推荐分值行程');
  await stubRecommendations(page, (tripId) => ({ body: payload(Number(tripId), 42) }));

  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByTestId('recommendation-row').first()).toContainText('匹配度 42%');
  await expect(page.getByTestId('recommendation-row').first()).not.toContainText('匹配度 90%');
});

test('切换行程后重新请求推荐', async ({ page }) => {
  await loginAs(page, 1);
  const first = await createTripViaApi(page, 1, '推荐切换 A');
  const second = await createTripViaApi(page, 1, '推荐切换 B');
  const hits = await stubRecommendations(page, (tripId) => ({ body: payload(Number(tripId), 90) }));

  await page.goto(`/#/trips/${first.id}`);
  await expect(page.getByTestId('recommendation-list')).toBeVisible();

  await page.goto(`/#/trips/${second.id}`);
  await expect(page.getByTestId('recommendation-list')).toBeVisible();

  expect(hits.get(String(first.id)) ?? 0).toBeGreaterThanOrEqual(1);
  expect(hits.get(String(second.id)) ?? 0).toBeGreaterThanOrEqual(1);
  expect((hits.get(String(first.id)) ?? 0) + (hits.get(String(second.id)) ?? 0)).toBeGreaterThan(1);
});

test('390px 窄屏不出现横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, 1);
  const created = await createTripViaApi(page, 1, '推荐窄屏行程');
  await stubRecommendations(page, (tripId) => ({ body: payload(Number(tripId), 90) }));

  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByTestId('recommendation-row').first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});