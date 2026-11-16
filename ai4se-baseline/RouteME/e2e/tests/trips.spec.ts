import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

async function pickPlace(page: Page, field: string, name: string) {
  const input = page.getByLabel(field);
  await input.fill(name);
  await input.press('Enter');
  await expect(page.locator('.place-chip-name', { hasText: name }).first()).toBeVisible();
}

async function pickDestination(page: Page, province: string, city: string) {
  await page.getByLabel('目的地').click();
  await page.locator('.ant-cascader-menu-item', { hasText: province }).first().click();
  await page.locator('.ant-cascader-menu-item', { hasText: city }).first().click();
  await page.keyboard.press('Escape');
}

async function createTripViaApi(page: Page, title: string) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
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

  await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
  await expect(page.getByRole('button', { name: /林见夏/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /陈屿/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /苏念/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /注册|找回密码/ })).toHaveCount(0);

  await page.getByRole('button', { name: /林见夏/ }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('今天想走哪条路');
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '佛山祖庙与岭南天地一日' })).toBeVisible();
  await expect(page.getByText('已满员').first()).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路摄影一日游' })).toHaveCount(0);
});

test('filters the list by interest tag and keeps the filters visible', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await page.getByRole('button', { name: '摄影', exact: true }).click();

  await expect(page.getByText('已应用筛选')).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '广州老城骑楼扫街半日' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '深圳大鹏半岛海岸线徒步' })).toHaveCount(0);

  await page.getByRole('button', { name: '清除全部条件' }).click();
  await expect(page.locator('.trip-card', { hasText: '深圳大鹏半岛海岸线徒步' })).toBeVisible();
});

test('publishes a trip and finds it from the home search', async ({ page }) => {
  const title = `E2E 周末骑行 ${Date.now()}`;
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await page.getByLabel('标题').fill(title);
  await pickDestination(page, '广东省', '珠海');
  await page.getByLabel('出发日期').fill('2026-12-05');
  await page.getByLabel('结束日期').fill('2026-12-05');
  await pickPlace(page, '途经点', '香洲港');
  await pickPlace(page, '途经点', '情侣路');
  await page.getByRole('button', { name: '摄影', exact: true }).click();

  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page).toHaveURL(/#\/trips\/\d+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('珠海').first()).toBeVisible();
  await expect(page.getByText('招募中').first()).toBeVisible();
  await expect(page.getByText('这是你发布的行程')).toBeVisible();

  await page.goto('/');
  await page.getByPlaceholder('搜索路线、地点或发布者').fill(title);
  await expect(page.locator('.trip-card', { hasText: title })).toBeVisible();
});

test('blocks publishing and flags every missing required field', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page).toHaveURL(/#\/trips\/new$/);
  for (const label of ['标题', '目的地', '出发日期', '结束日期', '途经点']) {
    await expect(page.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(page.getByText('给这条路线起个名字（40 字以内）')).toBeVisible();
  await expect(page.getByText('请选择目的地')).toBeVisible();
  await expect(page.getByText('请选择出发日期')).toBeVisible();
  await expect(page.getByText('请选择结束日期')).toBeVisible();
  await expect(page.getByText('至少写出两个途经点，别人才看得懂路线')).toBeVisible();
});

test('publisher marks a trip completed and sees the experience section', async ({ page }) => {
  const title = `E2E 结束行程 ${Date.now()}`;
  const created = await createTripViaApi(page, title);
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('这是你发布的行程')).toBeVisible();
  await page.getByRole('button', { name: '标记为已结束' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '标记为已结束' }).click();

  await expect(page.getByText('已结束').first()).toBeVisible();
  await expect(page.getByText('游后真实体验')).toBeVisible();
  await expect(page.getByRole('button', { name: '标记为已结束' })).toHaveCount(0);
});

test('defaults to the recruiting trips view with complete cards', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.getByRole('radiogroup', { name: '浏览视图' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '招募中的行程' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '旅行体验' })).not.toBeChecked();

  const card = page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' });
  await expect(card).toBeVisible();
  await expect(card.locator('.tc-title')).toHaveText('珠海情侣路日落机位二刷');
  await expect(card.locator('.tc-dest')).toHaveText('珠海');
  await expect(card.locator('.tc-meta')).toContainText('11月16日 → 11月16日');
  await expect(card.locator('.tc-meta')).toContainText('4 个途经点');
  await expect(card.locator('.tc-route')).toContainText('香洲港集合');
  await expect(card.locator('.tc-tags')).toContainText('摄影');
  await expect(card.locator('.tc-host-name')).toHaveText('陈屿');
  await expect(card.locator('.tc-cap-num')).toHaveText('1 / 3 人');
  await expect(card.locator('[data-status="recruiting"]')).toContainText('招募中');
});

test('distinguishes full trips from recruiting trips without color alone', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  const full = page.locator('.trip-card', { hasText: '佛山祖庙与岭南天地一日' });
  await expect(full.locator('[data-status="full"]')).toContainText('已满员');
  await expect(full.locator('[data-status-icon="full"]')).toBeVisible();
  await expect(full.locator('.meter.full')).toBeVisible();
  await expect(full.locator('.tc-cap-num')).toHaveText('2 / 2 人');

  const recruiting = page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' });
  await expect(recruiting.locator('[data-status="recruiting"]')).toContainText('招募中');
  await expect(recruiting.locator('[data-status-icon="recruiting"]')).toBeVisible();
  await expect(recruiting.locator('.meter.full')).toHaveCount(0);
});

test('keeps ended trips out of the default view', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路摄影一日游' })).toHaveCount(0);
  await expect(page.locator('.trip-card', { hasText: '清远英西峰林两日露营' })).toHaveCount(0);
  await expect(page.locator('.trip-card [data-status="completed"]')).toHaveCount(0);
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