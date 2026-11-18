import { expect, test, type Page } from '@playwright/test';

const API = '/api';

// 本 spec 造的行程在用例结束时统一结束，避免污染首页默认列表的分页与筛选断言。
let createdTripIds: number[] = [];

test.afterEach(async ({ page }) => {
  for (const tripId of createdTripIds) {
    await page.request
      .post(`${API}/trips/${tripId}/complete`, { headers: { 'X-User-Id': '2' } })
      .catch(() => undefined);
  }
  createdTripIds = [];
});

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function createTripViaApi(page: Page, publisherId: number, title: string, capacity = 4) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisherId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: todayIso(),
      end_date: todayIso(),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity,
    },
  });
  expect(response.ok()).toBeTruthy();
    const created = (await response.json()) as { id: number };
    createdTripIds.push(created.id);
    return created;
  }

async function applyViaApi(page: Page, userId: number, tripId: number, message: string | null = null) {
  const response = await page.request.post(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(userId), 'Content-Type': 'application/json' },
    data: { message },
  });
  expect(response.ok()).toBeTruthy();
}

async function acceptViaApi(page: Page, publisherId: number, tripId: number, applicantId: number) {
  const listResponse = await page.request.get(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(listResponse.ok()).toBeTruthy();
  const applications = (await listResponse.json()) as { id: number; applicant: { id: number } }[];
  const target = applications.find((application) => application.applicant.id === applicantId);
  expect(target).toBeTruthy();
  const response = await page.request.post(`${API}/applications/${target!.id}/accept`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(response.ok()).toBeTruthy();
}

async function completeViaApi(page: Page, publisherId: number, tripId: number) {
  const response = await page.request.post(`${API}/trips/${tripId}/complete`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(response.ok()).toBeTruthy();
}

test('shows the four groups with counts and the published group by default', async ({ page }) => {
  await loginAs(page, 2);
  await page.goto('/#/mine');

  await expect(page.getByRole('heading', { name: '我的旅行' })).toBeVisible();
    const seg = (label: string) => page.locator('.ant-segmented-item', { hasText: label });
    await expect(seg('我发布的')).toHaveClass(/ant-segmented-item-selected/);
    await expect(seg('我申请的')).toBeVisible();
    await expect(seg('已匹配同行')).toBeVisible();
    await expect(seg('已完成旅行')).toBeVisible();
  await expect(page.locator('.mine-seg .seg-count')).toHaveCount(4);
  await expect(page.locator('.mine-row').first()).toBeVisible();
  await expect(page.locator('.mine-row').first().locator('.mr-cover')).toBeVisible();
});

test('points the pending reminder at the trip that still needs handling', async ({ page }) => {
  const title = `E2E 提醒定位 ${Date.now()}`;
  const first = await createTripViaApi(page, 2, `${title} A`);
  const second = await createTripViaApi(page, 2, `${title} B`);
  await applyViaApi(page, 1, second.id);

  await loginAs(page, 2);
  await page.goto('/#/mine');

  await expect(page.getByText(/你有 \d+ 条申请等待处理/)).toBeVisible();
  const row = page.locator('.mine-row', { hasText: `${title} B` });
  await expect(row.getByRole('button', { name: /处理申请 · \d+/ })).toBeVisible();
  await page.getByRole('button', { name: '去处理' }).click();
  await expect(page).toHaveURL(new RegExp(`#/trips/${second.id}/applications$`));
  await expect(page).not.toHaveURL(new RegExp(`#/trips/${first.id}/applications$`));
});

test('withdraws a pending application from my trips', async ({ page }) => {
  const title = `E2E 撤回申请 ${Date.now()}`;
  const trip = await createTripViaApi(page, 2, title);
  await applyViaApi(page, 1, trip.id, '想一起拍日落。');

  await loginAs(page, 1);
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '我申请的' }).click();

  const row = page.locator('.mine-row', { hasText: title });
  await expect(row.getByText('申请待处理')).toBeVisible();
  await row.getByRole('button', { name: /撤\s*回/ }).click();
  await expect(page.getByText('申请已取消').first()).toBeVisible();
  await expect(page.locator('.mine-row', { hasText: title }).getByText('申请已取消')).toBeVisible();
  await expect(page.locator('.mine-row', { hasText: title }).getByRole('button', { name: /撤\s*回/ })).toHaveCount(0);
});

test('leaves a matched trip from my trips', async ({ page }) => {
  const title = `E2E 退出同行 ${Date.now()}`;
  const trip = await createTripViaApi(page, 2, title);
  await applyViaApi(page, 1, trip.id);
  await acceptViaApi(page, 2, trip.id, 1);

  await loginAs(page, 1);
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '已匹配同行' }).click();

  const row = page.locator('.mine-row', { hasText: title });
  await expect(row.getByRole('button', { name: '退出同行' })).toBeVisible();
  await row.getByRole('button', { name: '退出同行' }).click();
  const leaveDialog = page.getByRole('dialog');
  await leaveDialog.locator('[data-leave-reason]').selectOption('force_majeure');
  await expect(leaveDialog.locator('[data-leave-preview]')).toContainText('暂不扣分，待核实');
  await leaveDialog.locator('[data-leave-note]').fill('台风停航，无法出发');
  await leaveDialog.getByRole('button', { name: '退出同行' }).click();
  await expect(page.locator('.mine-row', { hasText: title })).toHaveCount(0);
});

test('opens the experience form for a completed trip', async ({ page }) => {
  const title = `E2E 完成写体验 ${Date.now()}`;
  const trip = await createTripViaApi(page, 2, title);
  await applyViaApi(page, 1, trip.id);
  await acceptViaApi(page, 2, trip.id, 1);
  await completeViaApi(page, 2, trip.id);

  await loginAs(page, 1);
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '已完成旅行' }).click();

  const row = page.locator('.mine-row', { hasText: title });
  await row.getByRole('button', { name: '发表游后体验' }).click();
  await expect(page).toHaveURL(new RegExp(`#/share/${trip.id}$`));
});

test('refreshes the groups when the page becomes visible again', async ({ page }) => {
  const title = `E2E 重新可见 ${Date.now()}`;
  const trip = await createTripViaApi(page, 2, title);
  await applyViaApi(page, 1, trip.id);

  await loginAs(page, 1);
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '已匹配同行' }).click();
  await expect(page.locator('.mine-row', { hasText: title })).toHaveCount(0);

  await acceptViaApi(page, 2, trip.id, 1);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  await expect(page.locator('.mine-row', { hasText: title })).toBeVisible();
});

test('states that nothing is pending when the user has no pending applications', async ({ page }) => {
  await loginAs(page, 3);
  await page.goto('/#/mine');

  await expect(page.getByText('目前没有待处理的申请。').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '去处理' })).toHaveCount(0);
});

test('wraps row actions below the content on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, 2);
  await page.goto('/#/mine');

  const row = page.locator('.mine-row').first();
  await expect(row).toBeVisible();
  const main = await row.locator('.mr-main').boundingBox();
  const actions = await row.locator('.mr-actions').boundingBox();
  expect(main).not.toBeNull();
  expect(actions).not.toBeNull();
  expect(actions!.y).toBeGreaterThan(main!.y);
  const pageBox = await page.locator('body').boundingBox();
  expect(actions!.x + actions!.width).toBeLessThanOrEqual(pageBox!.width + 1);
});