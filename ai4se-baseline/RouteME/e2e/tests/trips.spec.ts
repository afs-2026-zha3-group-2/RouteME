import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

async function createTripViaApi(page: Page, title: string) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination: '珠海',
      start_date: '2026-12-01',
      end_date: '2026-12-01',
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

test('shows the identity gate with three demo accounts and the unfinished trip list', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '选择一个演示身份' })).toBeVisible();
  await expect(page.getByRole('button', { name: /林见夏/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /陈屿/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /苏念/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /注册|找回密码/ })).toHaveCount(0);

  await page.getByRole('button', { name: /林见夏/ }).click();

  await expect(page.getByRole('heading', { name: '旅行灵感' })).toBeVisible();
  await expect(page.locator('.trip-card-link', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card-link', { hasText: '佛山祖庙与岭南天地一日' })).toBeVisible();
  await expect(page.getByText('已满员').first()).toBeVisible();
  await expect(page.locator('.trip-card-link', { hasText: '珠海情侣路摄影一日游' })).toHaveCount(0);
});

test('filters the list by interest tag and keeps the filters visible', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await page.getByRole('checkbox', { name: '摄影' }).click();

  await expect(page.getByText('已应用筛选')).toBeVisible();
  await expect(page.locator('.trip-card-link', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card-link', { hasText: '广州老城骑楼扫街半日' })).toBeVisible();
  await expect(page.locator('.trip-card-link', { hasText: '深圳大鹏半岛海岸线徒步' })).toHaveCount(0);

  await page.getByRole('button', { name: '清除全部条件' }).click();
  await expect(page.locator('.trip-card-link', { hasText: '深圳大鹏半岛海岸线徒步' })).toBeVisible();
});

test('publishes a trip and finds it from the home search', async ({ page }) => {
  const title = `E2E 周末骑行 ${Date.now()}`;
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await page.getByLabel('标题').fill(title);
  await page.getByLabel('目的地').click();
    await page.locator('.ant-select-item-option', { hasText: '珠海' }).first().click();
  await page.getByLabel('出发日期').fill('2026-12-05');
  await page.getByLabel('结束日期').fill('2026-12-05');
  await page.getByLabel('途经点（每行一个，至少两个）').fill('香洲港集合\n情侣路骑行');
  await page.getByRole('checkbox', { name: '摄影' }).click();
  await page.locator('.form-card button.ant-btn-primary').click();

  await expect(page).toHaveURL(/#\/trips\/\d+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('招募中').first()).toBeVisible();

  await page.goto('/');
  await page.getByPlaceholder('搜索路线、地点或发布者').fill(title);
  await expect(page.locator('.trip-card-link', { hasText: title })).toBeVisible();
});

test('publisher marks a trip completed and sees the experience placeholder', async ({ page }) => {
  const title = `E2E 结束行程 ${Date.now()}`;
  const created = await createTripViaApi(page, title);
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('这是你发布的行程')).toBeVisible();
  await page.getByRole('button', { name: '标记为已结束' }).click();
  await page.locator('.ant-popconfirm .ant-btn-primary').click();

  await expect(page.getByText('已结束').first()).toBeVisible();
  await expect(page.getByText('游后分享将在体验能力上线后展示')).toBeVisible();
  await expect(page.getByRole('button', { name: '标记为已结束' })).toHaveCount(0);
});

test('keeps out-of-scope actions off the screens', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/5');

  await expect(page.getByRole('button', { name: '申请同行' })).toBeVisible();
  await expect(page.getByRole('button', { name: '标记为已结束' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /编辑|删除|取消行程/ })).toHaveCount(0);

  await page.goto('/#/trips/9999');
  await expect(page.getByText('行程不存在')).toBeVisible();
});