import { expect, test, type Page } from '@playwright/test';

const API = '/api';

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
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('.area-option', { hasText: province }).first().click();
  await page.locator('.area-option', { hasText: city }).first().click();
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

async function clearDate(page: Page, label: string) {
  const picker = page.locator('.ant-picker', { has: page.getByLabel(label) });
  await picker.hover();
  await picker.locator('.ant-picker-clear').click();
}

/** Local calendar day, matching the form's default (never UTC). */
function todayIso(): string {
  return isoDaysFromToday(0);
}

function isoDaysFromToday(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function createTripViaApi(page: Page, title: string, startDate = todayIso(), endDate = startDate) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: startDate,
      end_date: endDate,
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

test('shows the login-only identity gate and the unfinished trip list', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
  // 周野已落库凭据（V15），演示身份直接进入区块整体移除，首页无法一键进入。
  await expect(page.locator('.gate-cards')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /周野/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /林见夏/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /陈屿/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /苏念/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /注册|找回密码/ })).toHaveCount(0);

  // 以本机身份直接进入（同其他用例），保证下方未完成任务列表断言仍以 id1 视角成立。
  await loginAs(page, 1);
  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('今天想走哪条路');
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '佛山祖庙与岭南天地一日' })).toBeVisible();
  await expect(page.getByText('已满员').first()).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路摄影一日游' })).toHaveCount(0);
});

test('filters the list by interest tag and keeps the filters visible', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await page.getByRole('checkbox', { name: '摄影', exact: true }).click();

  await expect(page.getByText('已应用筛选')).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '广州老城骑楼扫街半日' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '深圳大鹏半岛海岸线徒步' })).toHaveCount(0);

  await page.getByRole('button', { name: '清除全部条件' }).click();
  await expect(page.locator('.trip-card', { hasText: '深圳大鹏半岛海岸线徒步' })).toBeVisible();
});

test('publishes a trip and finds it in the home list', async ({ page }) => {
  const title = `E2E 周末骑行 ${Date.now()}`;
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await expect(page.getByRole('heading', { name: '基本信息' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '简单路线' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '同行与预算' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '兴趣标签' })).toBeVisible();
  await expect(page.getByLabel('出发日期')).toHaveValue(todayIso());
  await expect(page.getByLabel('结束日期')).toHaveValue(todayIso());
  await expect(page.locator('[data-testid="place-map"]')).toHaveCount(0);
  await expect(page.getByText('先选目的地，再按城市点选途经点。')).toBeVisible();

  const cascader = page.locator('.area-trigger').first();
  const cascaderWidth = await cascader.evaluate((node) => node.getBoundingClientRect().width);
  const fieldWidth = await cascader.evaluate(
    (node) => node.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(Math.abs(cascaderWidth - fieldWidth)).toBeLessThanOrEqual(2);

  await page.getByLabel('标题').fill(title);
  await pickDestination(page, '广东省', '珠海市');

  const map = page.locator('[data-testid="place-map"]');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-city', '珠海');
  await expect(map.getByRole('button', { name: /情侣路/ })).toBeVisible();
  await setDate(page, '出发日期', isoDaysFromToday(7));
  await setDate(page, '结束日期', isoDaysFromToday(7));
  await pickPlace(page, '途经点', '香洲港');
  await pickPlace(page, '途经点', '情侣路');
  await page.getByRole('checkbox', { name: '摄影', exact: true }).click();

  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page).toHaveURL(/#\/trips\/\d+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('珠海').first()).toBeVisible();
  await expect(page.getByText('招募中').first()).toBeVisible();
  await expect(page.getByText('这是你发布的行程')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('.trip-card', { hasText: title })).toBeVisible();
});

test('explains a destination without offline map coverage', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await pickDestinationByCode(page, '110000', '110100');

  await expect(page.locator('[data-testid="place-map"]')).toHaveCount(0);
  await expect(page.getByText('这个城市暂时没有离线点位')).toBeVisible();
  await expect(page.getByText('先选目的地，再按城市点选途经点。')).toHaveCount(0);
});

test('blocks publishing and flags every missing required field', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await clearDate(page, '出发日期');
  await clearDate(page, '结束日期');
  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page).toHaveURL(/#\/trips\/new$/);
  await expect(page.getByLabel('标题')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#trip-destination')).toHaveAttribute('aria-invalid', 'true');
  for (const label of ['出发日期', '结束日期', '途经点']) {
    await expect(page.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(page.getByText('给这条路线起个名字（40 字以内）')).toBeVisible();
  await expect(page.getByText('请选择目的地')).toBeVisible();
  await expect(page.getByText('请选择出发日期')).toBeVisible();
  await expect(page.getByText('请选择结束日期')).toBeVisible();
  await expect(page.getByText('至少写出两个途经点，别人才看得懂路线')).toBeVisible();
});

test('publisher ends an ongoing trip and sees the experience section', async ({ page }) => {
  const title = `E2E 结束行程 ${Date.now()}`;
  const created = await createTripViaApi(page, title);
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('这是你发布的行程')).toBeVisible();
  await expect(page.getByText('旅行中').first()).toBeVisible();

  await page.locator('.detail-actions-primary').getByRole('button', { name: '结束行程' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /取\s*消/ }).click();
  await expect(page.getByText('旅行中').first()).toBeVisible();

  await page.locator('.detail-actions-primary').getByRole('button', { name: '结束行程' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '结束行程' }).click();

  await expect(page.getByText('已结束').first()).toBeVisible();
  await expect(page.getByText('游后真实体验')).toBeVisible();
  await expect(page.getByRole('button', { name: '结束行程' })).toHaveCount(0);
});

test('defaults to the recruiting trips view with complete cards', async ({ page }) => {
  const title = `E2E 默认卡片 ${Date.now()}`;
  await createTripViaApi(page, title, isoDaysFromToday(7), isoDaysFromToday(7));
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.getByRole('radiogroup', { name: '浏览视图' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '招募中的行程' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '旅行体验' })).not.toBeChecked();

  const card = page.locator('.trip-card', { hasText: title });
  await expect(card).toBeVisible();
  await expect(card.locator('.tc-title')).toHaveText(title);
  await expect(card.locator('.tc-dest')).toHaveText('珠海市');
  await expect(card.locator('.tc-meta')).toContainText(/周[一二三四五六日]出发/);
  await expect(card.locator('.tc-route')).toContainText('香洲港集合');
  await expect(card.locator('.tc-tags')).toContainText('摄影');
  await expect(card.locator('.tc-host-name')).toContainText('林见夏');
  await expect(card.locator('.tc-cap-num')).toHaveText('1 / 3 人');
  await expect(card.locator('[data-status="recruiting"]')).toContainText('招募中');
});

test('distinguishes full trips from recruiting trips without color alone', async ({ page }) => {
  const title = `E2E 招募卡片 ${Date.now()}`;
  await createTripViaApi(page, title, isoDaysFromToday(7), isoDaysFromToday(7));
  await loginAs(page, 1);
  await page.goto('/');

  const full = page.locator('.trip-card', { hasText: '佛山祖庙与岭南天地一日' });
  await expect(full.locator('[data-status="full"]')).toContainText('已满员');
  await expect(full.locator('[data-status-icon="full"]')).toBeVisible();
  await expect(full.locator('.tc-meter.is-full')).toBeVisible();
  await expect(full.locator('.tc-cap-num')).toHaveText('2 / 2 人');

  const recruiting = page.locator('.trip-card', { hasText: title });
  await expect(recruiting.locator('[data-status="recruiting"]')).toContainText('招募中');
  await expect(recruiting.locator('[data-status-icon="recruiting"]')).toBeVisible();
  await expect(recruiting.locator('.tc-meter.is-full')).toHaveCount(0);
});

test('keeps ended trips out of the default view', async ({ page }) => {
  const title = `E2E 未结束 ${Date.now()}`;
  await createTripViaApi(page, title, isoDaysFromToday(7), isoDaysFromToday(7));
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.locator('.trip-card', { hasText: title })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路摄影一日游' })).toHaveCount(0);
  await expect(page.locator('.trip-card', { hasText: '清远英西峰林两日露营' })).toHaveCount(0);
  await expect(page.locator('.trip-card [data-status="completed"]')).toHaveCount(0);
});

test('keeps out-of-scope actions off the screens', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/5');

  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeVisible();
  await expect(page.getByRole('button', { name: '结束行程' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /编辑|删除|取消行程/ })).toHaveCount(0);

  await page.goto('/#/trips/9999');
  await expect(page.getByText('行程不存在')).toBeVisible();
});

test('filters by province and city without a search box', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.getByPlaceholder('搜索路线、地点或发布者')).toHaveCount(0);
  await pickDestination(page, '广东省', '珠海市');

  await expect(page.getByText('已应用筛选')).toBeVisible();
  await expect(page.locator('.active-summary')).toContainText('广东省 / 珠海市');
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '广州老城骑楼扫街半日' })).toHaveCount(0);

  await page.getByRole('button', { name: '清除全部条件' }).click();
  await expect(page.locator('.trip-card', { hasText: '广州老城骑楼扫街半日' })).toBeVisible();
});