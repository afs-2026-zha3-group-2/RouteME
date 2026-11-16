import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

async function switchUser(page: Page, userId: number) {
  await loginAs(page, userId);
  await page.reload();
}

function createGate() {
  let release!: () => void;
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { opened, release: () => release() };
}

async function createCompletedTrip(page: Page, title: string) {
  const created = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: '2026-12-20',
      end_date: '2026-12-20',
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(created.ok()).toBeTruthy();
  const trip = (await created.json()) as { id: number };
  const completed = await page.request.post(`${API}/trips/${trip.id}/complete`, {
    headers: { 'X-User-Id': '1' },
  });
  expect(completed.ok()).toBeTruthy();
  return trip;
}

test('shows seeded experiences in the travel experience view', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();

  await expect(page.locator('.exp-card').first()).toBeVisible();
    await expect(page.getByText(/强度 · 适中/).first()).toBeVisible();
    await expect(page.getByText(/强度 · 较累/).first()).toBeVisible();
    expect(await page.locator('.exp-card').count()).toBeGreaterThanOrEqual(2);
    await expect(page.getByText(/带一件防风外套|鞋一定要抓地/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '参考此行程发布' }).first()).toBeVisible();
});

test('shares an experience and reuses it to publish a new plan', async ({ page }) => {
  const title = `E2E 游后分享 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
    const content = `整条线基本没有爬升，日落前四十分钟到海滨泳场刚好，再晚机位就满了。记录 ${Date.now()}`;

  await loginAs(page, 1);
  await page.goto(`/#/share/${trip.id}`);
  await page.getByPlaceholder(/路况、强度、时间点/).fill(content);
  await page.getByRole('radio', { name: /较累/ }).check();
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('带一件防风外套。');
  await page.getByRole('button', { name: '发布体验' }).click();

  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.getByText(content)).toBeVisible();
  await expect(page.getByText('强度 · 较累').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '修改我的体验' })).toBeVisible();

  await page.goto('/');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  await expect(page.getByText(content)).toBeVisible();

  await page.goto(`/#/trips/${trip.id}`);
  await page.getByRole('button', { name: '参考此行程发布' }).click();
  await expect(page.getByRole('heading', { name: '发布旅行计划' })).toBeVisible();
  await expect(page.getByText(/已预填目的地、途经点与兴趣/)).toBeVisible();
  await expect(page.getByLabel('计划人数（含自己，2–12）')).toHaveValue('');
  await expect(page.getByLabel('标题')).toHaveValue('');
  await expect(page.locator('.place-chip-name', { hasText: '香洲港集合' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '摄影', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: /^发\s*布$/ }).click();
  await expect(page.getByText(/给这条路线起个名字|请选择出发日期|含你在内至少 2 人/).first()).toBeVisible();
});

test('keeps experience entry points honest', async ({ page }) => {
  await loginAs(page, 3);
  await page.goto('/#/share/1');
  await expect(page.getByText('只有已结束、并且你实际参加过的行程才能发表体验')).toBeVisible();

  await page.goto('/#/share/3');
  await expect(page.getByText('只有已结束、并且你实际参加过的行程才能发表体验')).toBeVisible();

  await switchUser(page, 1);
  await page.goto('/#/share/1');
  await expect(page.getByPlaceholder(/路况、强度、时间点/)).toBeVisible();
  await expect(page.getByRole('button', { name: /上传图片|添加图片/ })).toHaveCount(0);
  await expect(page.getByText('分享边界')).toBeVisible();
});

test('switches to the experience view and marks ended origin trips', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();

  await expect(page.getByRole('radio', { name: '旅行体验' })).toBeChecked();
  await expect(page.locator('.trip-card')).toHaveCount(0);
  await expect(page.locator('.result-count')).toContainText('条体验');

  const first = page.locator('.exp-card').first();
  await expect(first).toBeVisible();
  await expect(first.locator('.exp-origin')).toContainText('来自');
  await expect(first.locator('[data-status="completed"]')).toContainText('已结束');
  await expect(first.locator('[data-status-icon="completed"]')).toBeVisible();
});

test('guides an empty filter state to publish from both views', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  // 搜索已移除；用未来日期筛选制造空态。
  await page.getByLabel('出发不早于').fill('2099-01-01');
  await expect(page.getByText('还没有符合条件的行程')).toBeVisible();
  await expect(page.getByRole('button', { name: '清除全部条件' }).first()).toBeVisible();
  await page.getByRole('button', { name: '去发布行程' }).click();
  await expect(page).toHaveURL(/#\/trips\/new$/);

  await page.goto('/');
  await page.getByLabel('出发不早于').fill('2099-01-01');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  await expect(page.getByText('还没有符合的旅行体验')).toBeVisible();
  await page.getByRole('button', { name: '去发布行程' }).click();
  await expect(page).toHaveURL(/#\/trips\/new$/);
});

test('shows skeletons instead of the previous view while lists load', async ({ page }) => {
  const matchesGate = createGate();
  const experiencesGate = createGate();
  await page.route('**/api/matches**', async (route) => {
    await matchesGate.opened;
    await route.continue();
  });
  await page.route('**/api/experiences**', async (route) => {
    await experiencesGate.opened;
    await route.continue();
  });

  await loginAs(page, 1);
  await page.goto('/');

  await expect(
    page.locator('[aria-busy="true"][aria-label="正在加载招募中的行程"]'),
  ).toBeVisible();
  await expect(page.locator('.trip-card')).toHaveCount(0);

  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  await expect(
    page.locator('[aria-busy="true"][aria-label="正在加载旅行体验"]'),
  ).toBeVisible();
  await expect(page.locator('.trip-card')).toHaveCount(0);

  matchesGate.release();
  experiencesGate.release();
  await expect(page.locator('.exp-card').first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});