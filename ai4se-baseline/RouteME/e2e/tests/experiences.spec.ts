import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './support';

const API = '/api';

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

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function createCompletedTrip(page: Page, title: string) {
  const created = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: todayIso(),
      end_date: todayIso(),
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

function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function createOpenTrip(page: Page, title: string) {
  const created = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: tomorrowIso(),
      end_date: tomorrowIso(),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(created.ok()).toBeTruthy();
  return (await created.json()) as { id: number };
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
  const hero = page.locator('.share-hero');
  await expect(hero).toContainText(title);
  await expect(hero).toContainText('人同行');
  await expect(hero.locator('[data-status="completed"]')).toContainText('已结束');
  await expect(page.getByText('你的体验会去哪里')).toBeVisible();
  await expect(page.getByText('出现在这条行程的详情页，和原路线放在一起。')).toBeVisible();
  await expect(page.getByText('别人可以点「参考此行程发布」，把它变成自己的新计划。')).toBeVisible();
  await expect(page.getByText('分享边界')).toBeVisible();
  await expect(page.getByText('不要写入同行者的电话、学校班级或住宿地址。')).toBeVisible();

  await page.getByPlaceholder(/路况、强度、时间点/).fill(content);
  await page.getByRole('radio', { name: /较累/ }).check();
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('带一件防风外套。');
  await page.getByRole('button', { name: '发布体验' }).click();

  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.getByText(content)).toBeVisible();
  await expect(page.getByText('强度 · 较累').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '修改我的体验' })).toBeVisible();
  await expect(page.locator('.experience-list li')).toHaveCount(1);

  await page.goto('/');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  await expect(page.getByText(content)).toBeVisible();

  await page.goto(`/#/trips/${trip.id}`);
  await page.getByRole('button', { name: '参考此行程发布' }).click();
  await expect(page.getByRole('heading', { name: '发布一条想走的路' })).toBeVisible();
  await expect(page.getByText(/已预填目的地、途经点与兴趣/)).toBeVisible();
  // v3 发布页把「招募人数」收进侧栏卡片，默认 2 人（不再留空输入框）。
  await expect(page.getByText('招募人数').first()).toBeVisible();
  await expect(page.locator('.publish-companions-card')).toContainText('2 人');
  await expect(page.getByLabel('标题')).toHaveValue('');
  await expect(page.locator('.place-chip-name', { hasText: '香洲港集合' }).first()).toBeVisible();
  // v3 已选标签以可关闭标签展示，不再出现在下方可选复选框里。
  const selectedTag = page.locator('.publish-tag-row .ant-tag').filter({ hasText: '摄影' });
  await expect(selectedTag).toBeVisible();
  await expect(selectedTag.locator('.ant-tag-close-icon')).toBeVisible();

  await page.getByRole('button', { name: /^发\s*布/ }).click();
  await expect(page.getByText(/给这条路线起个名字|请选择出发日期|含你在内至少 2 人/).first()).toBeVisible();
});

test('renders the share page with the prototype layout', async ({ page }) => {
  const title = `E2E 分享布局 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);

  await loginAs(page, 1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/#/share/${trip.id}`);

  await expect(page.locator('.page-head .page-title')).toContainText('把这次旅行留给下一个人');
  await expect(page.locator('.page-head .page-sub')).not.toBeEmpty();
  await expect(page.locator('.detail-back')).toHaveAttribute('href', `#/trips/${trip.id}`);

  const heroMeta = page.locator('.share-hero-body span').first();
  await expect(heroMeta).toContainText(/\d+月\d+日/);
  await expect(heroMeta).toContainText(/周[一二三四五六日]/);
  await expect(heroMeta).toContainText('人同行');
  const cover = await page.locator('.share-hero-cover').evaluate((node) => {
    const style = window.getComputedStyle(node);
    return { width: style.width, height: style.height };
  });
  expect(cover).toEqual({ width: '76px', height: '60px' });

  const columns = async () =>
    page.locator('.publish-grid').evaluate((node) =>
      window.getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length,
    );

  expect(await columns()).toBe(2);
  await expect(page.locator('.publish-main .panel')).toHaveCount(4);
  await expect(page.locator('.publish-side .panel')).toHaveCount(2);
  await expect(page.locator('.publish-main .panel-title')).toContainText([
    '真实感受',
    '照片（选填）',
    '路线强度',
    '给后来者的一条建议',
  ]);

  await expect(page.locator('.int-card')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /适中/ })).toBeChecked();
  await page.getByRole('radio', { name: /较累/ }).check();
  await expect(page.locator('.int-card.coral')).toHaveClass(/on/);
  await expect(page.locator('.int-card.on')).toHaveCount(1);

  const sideLists = page.locator('.publish-side .share-list');
  await expect(sideLists).toHaveCount(2);
  await expect(sideLists.nth(0).locator('li')).toHaveCount(3);
  await expect(sideLists.nth(0).locator('li svg')).toHaveCount(3);
  await expect(sideLists.nth(1).locator('li')).toHaveCount(2);
  await expect(sideLists.nth(1).locator('li svg')).toHaveCount(2);

  await page.setViewportSize({ width: 880, height: 1000 });
  await expect.poll(columns).toBe(1);
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
});

test('updates the existing experience instead of adding another one', async ({ page }) => {
  const title = `E2E 修改体验 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
  const first = `第一次写下的感受，路线平缓，日落前到海滨泳场正好。${Date.now()}`;
  const second = `改过之后的感受，风比想象大，记得带外套。${Date.now()}`;

  await loginAs(page, 1);
  await page.goto(`/#/share/${trip.id}`);
  await page.getByPlaceholder(/路况、强度、时间点/).fill(first);
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('带一件防风外套。');
  await page.getByRole('button', { name: '发布体验' }).click();
  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.locator('.experience-list li')).toHaveCount(1);

  await page.getByRole('button', { name: '修改我的体验' }).click();
  await expect(page.getByRole('heading', { name: '修改我的游后体验' })).toBeVisible();
  await expect(page.getByPlaceholder(/路况、强度、时间点/)).toHaveValue(first);
  await page.getByPlaceholder(/路况、强度、时间点/).fill(second);
  await page.getByRole('button', { name: '保存修改' }).click();

  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.getByText(second)).toBeVisible();
  await expect(page.getByText(first)).toHaveCount(0);
  await expect(page.locator('.experience-list li')).toHaveCount(1);
});

test('keeps experience entry points honest', async ({ page }) => {
  const openTrip = await createOpenTrip(page, `E2E 未结束 ${Date.now()}`);

  await loginAs(page, 3);
  await page.goto(`/#/share/${openTrip.id}`);
  await expect(page.getByText('行程结束后才能发表体验')).toBeVisible();
  await expect(page.getByText('当前状态：招募中')).toBeVisible();
  await expect(page.getByPlaceholder(/路况、强度、时间点/)).toHaveCount(0);

  await page.goto('/#/share/1');
  await expect(page.getByText('只有参加过的同行者才能发表体验')).toBeVisible();
  await expect(page.getByPlaceholder(/路况、强度、时间点/)).toHaveCount(0);

  await switchUser(page, 1);
  await page.goto('/#/share/1');
  await expect(page.getByPlaceholder(/路况、强度、时间点/)).toBeVisible();
  await expect(page.getByRole('button', { name: '添加照片' })).toBeVisible();
  await expect(page.getByText('分享边界')).toBeVisible();
});

test('marks completed trips as shared in my trips', async ({ page }) => {
  const title = `E2E 我的旅行分享 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
  const content = `从我的旅行进入分享页，写下这段真实感受。${Date.now()}`;

  await loginAs(page, 1);
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '已完成旅行' }).click();
  const row = page.locator('.mine-row', { hasText: title });
  await expect(row.getByRole('button', { name: '发表游后体验' })).toBeVisible();

  await row.getByRole('button', { name: '发表游后体验' }).click();
  await expect(page).toHaveURL(new RegExp(`#/share/${trip.id}$`));
  await page.getByPlaceholder(/路况、强度、时间点/).fill(content);
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('早点出发。');
  await page.getByRole('button', { name: '发布体验' }).click();

  await page.getByRole('link', { name: '我的旅行' }).first().click();
  await page.locator('.ant-segmented-item', { hasText: '已完成旅行' }).click();
  await expect(row.getByRole('button', { name: '修改我的体验' })).toBeVisible();
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
  await expect(first.locator('.exp-cover')).toBeVisible();
  await expect(first.locator('.exp-origin')).toContainText('来自');
  await expect(first.locator('[data-status="completed"]')).toContainText('已结束');
  await expect(first.locator('[data-status-icon="completed"]')).toBeVisible();
});

test('guides an empty filter state to publish from both views', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  // 搜索已移除；用未来日期筛选制造空态。
  await page.getByLabel('出发不早于').fill('2099-01-01');
  await page.getByLabel('出发不早于').press('Enter');
  await expect(page.getByText('还没有符合条件的行程')).toBeVisible();
  await expect(page.getByRole('button', { name: '清除全部条件' }).first()).toBeVisible();
  await page.getByRole('button', { name: '去发布行程' }).click();
  await expect(page).toHaveURL(/#\/trips\/new$/);

  await page.goto('/');
  await page.getByLabel('出发不早于').fill('2099-01-01');
  await page.getByLabel('出发不早于').press('Enter');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  await expect(page.getByText('还没有符合的旅行体验')).toBeVisible();
  await page.getByRole('button', { name: '去发布行程' }).click();
  await expect(page).toHaveURL(/#\/trips\/new$/);
});

test('shows skeletons instead of the previous view while lists load', async ({ page }) => {
  const tripsGate = createGate();
  const experiencesGate = createGate();
  await page.route('**/api/trips**', async (route) => {
    await tripsGate.opened;
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

  tripsGate.release();
  experiencesGate.release();
  await expect(page.locator('.exp-card').first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});

test('rejects experience sharing after the trip is cancelled', async ({ page }) => {
  const title = `E2E 取消体验 ${Date.now()}`;
  const trip = await createOpenTrip(page, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByText('这是你发布的行程')).toBeVisible();
  await expect(page.getByRole('button', { name: '发表游后体验' })).toHaveCount(0);

  const cancelled = await page.request.post(`${API}/trips/${trip.id}/cancel`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: { reason: 'personal' },
  });
  expect(cancelled.ok()).toBeTruthy();

  await page.reload();
  await expect(page.getByText('这条行程已取消')).toBeVisible();
  await expect(page.getByRole('button', { name: '发表游后体验' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '结束行程' })).toHaveCount(0);

  // 直接进入分享页也停在不可发表状态。
  await page.goto(`/#/share/${trip.id}`);
  await expect(page.getByText('行程结束后才能发表体验')).toBeVisible();
  await expect(page.getByText('当前状态：已取消')).toBeVisible();
  await expect(page.getByPlaceholder(/路况、强度、时间点/)).toHaveCount(0);

  const rejected = await page.request.post(`${API}/trips/${trip.id}/experiences`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: { content: '取消后不应该能发表体验。', intensity: 'relaxed', advice: '无' },
  });
  expect(rejected.status()).toBe(403);
});

test('admin removes any travel inspiration from the home list', async ({ page }) => {
  const title = `E2E 管理员删除 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
  const content = `管理员会删除这条旅行灵感 ${Date.now()}`;
  const shared = await page.request.post(`${API}/trips/${trip.id}/experiences`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: { content, intensity: 'relaxed', advice: '无' },
  });
  expect(shared.ok()).toBeTruthy();
  const experience = (await shared.json()) as { id: number };

  // 普通用户：看不到删除入口。
  await loginAs(page, 1);
  await page.goto('/');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  const card = page.locator('.exp-card').filter({ hasText: content });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: /删除/ })).toHaveCount(0);

  // 管理员：首页旅行灵感卡直接删除（二次确认）。
  await loginAsAdmin(page);
  await page.goto('/');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  const adminCard = page.locator('.exp-card').filter({ hasText: content });
  await expect(adminCard).toBeVisible();
  await adminCard.getByRole('button', { name: /删除/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /删\s*除/ }).click();
  await expect(adminCard).toHaveCount(0);
  await expect(page.getByText('已删除该旅行灵感')).toBeVisible();

  const list = await page.request.get(`${API}/experiences`, { headers: { 'X-User-Id': '1' } });
  const items = ((await list.json()) as { items: { id: number }[] }).items;
  expect(items.some((item) => item.id === experience.id)).toBe(false);

  // 普通用户直接调用删除接口仍被拒绝。
  const login = await page.request.post(`${API}/auth/login`, {
    data: { username: 'linjianxia', password: '123456' },
  });
  const token = ((await login.json()) as { token: string }).token;
  const forbidden = await page.request.delete(`${API}/admin/experiences/${experience.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(forbidden.status()).toBe(403);
});