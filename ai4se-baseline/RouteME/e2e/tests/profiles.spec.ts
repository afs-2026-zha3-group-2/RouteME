import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

function card(page: Page, title: string) {
  return page.locator('.trip-card', { hasText: title });
}

test('opens the publisher profile from a trip card without entering the detail page', async ({ page }) => {
  await loginAs(page, 3);
  await page.goto('/');

  await card(page, '上海武康路咖啡散步').getByRole('button', { name: /周野/ }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(page).not.toHaveURL(/#\/trips\//);
  await expect(modal.getByText('周野', { exact: true })).toBeVisible();
  await expect(modal.getByText('产品经理 · INFP')).toBeVisible();
  await expect(modal.getByText(/加入于/)).toBeVisible();
  await expect(modal.locator('.tag', { hasText: '城市漫步' }).first()).toBeVisible();
  await expect(modal.getByText('你们的共同兴趣：展览')).toBeVisible();
  await expect(modal.locator('.profile-stat', { hasText: '发布行程' })).toContainText('1');
  await expect(modal.locator('.profile-stat', { hasText: '已完成' })).toContainText('0');
  await expect(modal.locator('.profile-stat', { hasText: '参与同行' })).toContainText('0');
  await expect(modal.locator('.profile-stat', { hasText: '游后分享' })).toContainText('0');
  await expect(modal.locator('.privacy-note')).toContainText('电话、证件、精确住址和实时位置');

  await modal.locator('.ant-modal-footer').getByRole('button', { name: /^关\s*闭$/ }).click();
  await expect(modal).toBeHidden();
});

test('opens the publisher profile from the trip detail page', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/3');

  await page.getByRole('button', { name: /查看 陈屿 的资料/ }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(modal.getByText('陈屿', { exact: true })).toBeVisible();
  await expect(modal.getByText('研一 · 地理科学')).toBeVisible();
  await expect(modal.getByText(/加入于/)).toBeVisible();
  await expect(page).toHaveURL(/#\/trips\/3$/);
});

test('hides shared interests when the viewer has no overlap with the publisher', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await card(page, '上海武康路咖啡散步').getByRole('button', { name: /周野/ }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal.getByText('周野', { exact: true })).toBeVisible();
  await expect(modal.getByText(/你们的共同兴趣/)).toHaveCount(0);
});

test('marks your own profile and hides shared interests', async ({ page }) => {
  await loginAs(page, 4);
  await page.goto('/');

  await card(page, '上海武康路咖啡散步').getByRole('button', { name: /周野/ }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal.getByText('这是你')).toBeVisible();
  await expect(modal.getByText(/你们的共同兴趣/)).toHaveCount(0);
});

test('keeps private fields, credentials and reporting out of the profile modal', async ({ page }) => {
  await loginAs(page, 3);
  await page.goto('/');

  await card(page, '上海武康路咖啡散步').getByRole('button', { name: /周野/ }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  for (const blocked of ['举报这位用户', '用户名', 'password', 'token', '电话：', '身份证', '门牌']) {
    await expect(modal.getByText(blocked, { exact: false })).toHaveCount(0);
  }
  await expect(modal.locator('.ant-modal-footer button')).toHaveCount(1);
  await expect(modal.locator('.ant-modal-footer button')).toHaveText(/^关\s*闭$/);
});

test('shows a not-found message instead of stale profile data', async ({ page }) => {
  await loginAs(page, 1);
  await page.route('**/api/users/4/profile', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"USER_NOT_FOUND"}' }),
  );
  await page.goto('/');

  await card(page, '上海武康路咖啡散步').getByRole('button', { name: /周野/ }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal.getByText('用户不存在')).toBeVisible();
  await expect(modal.locator('.profile-stats')).toHaveCount(0);
});

test('shows a load failure message for unexpected errors', async ({ page }) => {
  await loginAs(page, 1);
  await page.route('**/api/users/4/profile', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"INTERNAL_ERROR"}' }),
  );
  await page.goto('/');

  await card(page, '上海武康路咖啡散步').getByRole('button', { name: /周野/ }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal.getByText('资料加载失败')).toBeVisible();
  await expect(modal.locator('.profile-stats')).toHaveCount(0);
});

test('keeps the existing trip report entry working', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/5');

  await page.getByRole('button', { name: /^举\s*报$/ }).click();
  await expect(page.getByText('举报行程或用户')).toBeVisible();
});
