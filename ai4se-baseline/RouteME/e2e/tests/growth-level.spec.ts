import { expect, test, type Page } from '@playwright/test';
import { acceptApplicationViaApi, applyViaApi, loginAsAdmin } from './support';
import {
  API,
  createCompletedTrip,
  createFutureTrip,
  publishExperience,
  readProfileGrowth,
  registerAccount,
  seedExp,
  useAccount,
} from './growthSupport';

/**
 * REQ-033 / add-growth-level 的端到端口径（E1–E8 + R1–R4）。
 *
 * 造数：单日正向经验有上限（发布 +10 / 点赞分档），无法在一天内堆到 LV3，
 * 因此 E1 / E3 / E4 用 `seedExp` 直接写 `user_growth_account` + 种子账本行；
 * E2 用真实「发布体验」链路验证 +10，E3 用真实「举报成立」链路验证 −50。
 */

const BEARER = (token: string) => ({ Authorization: `Bearer ${token}` });
const WRITE = (userId: number) => ({
  'X-User-Id': String(userId),
  'Content-Type': 'application/json',
});

async function creditScore(page: Page, userId: number): Promise<number> {
  const response = await page.request.get(`${API}/users/credits?ids=${userId}`, {
    headers: { 'X-User-Id': String(userId) },
  });
  expect(response.ok()).toBeTruthy();
  const entries = (await response.json()) as { user_id: number; credit_score: number }[];
  return entries.find((entry) => entry.user_id === userId)!.credit_score;
}

test.describe.configure({ mode: 'serial' });

test('E1/E8/R4 本人可见等级与经验进度，他人只看到 LVn', async ({ page }) => {
  const author = await registerAccount(page, '主页');
  const viewer = await registerAccount(page, '访客');
  seedExp(author.userId, 240);

  await useAccount(page, author);
  await page.goto(`/#/users/${author.userId}`);
  const pill = page.locator('.profile-hero-meta .growth-pill').first();
  await expect(pill).toContainText('LV3');
  await expect(pill).toContainText('成长等级');
  await expect(page.locator('.growth-progress .gp-top b')).toHaveText('240 / 300 EXP');
  await expect(page.locator('.growth-progress .gp-hint')).toContainText('今日经验 0 / 20');
  // R4：只出现 LVn，不出现中文头衔或 LV6。
  await expect(pill).toHaveText(/^LV[1-5]/);
  await expect(page.getByText(/LV6|青铜|白银|黄金|铂金|钻石/)).toHaveCount(0);

  // E8：他人视角只显示等级，不返回也不渲染经验数字。
  await useAccount(page, viewer);
  await page.goto(`/#/users/${author.userId}`);
  await expect(page.locator('.profile-hero-meta .growth-pill').first()).toContainText('LV3');
  await expect(page.locator('.growth-progress')).toHaveCount(0);
  await expect(page.getByText(/240|EXP|成长经验/)).toHaveCount(0);
  // 成长与信用并列但文案区分。
  await expect(page.locator('.profile-credit')).toContainText('信用分');
});

test('E2 发布体验后本人进度 +10，信用分不受影响', async ({ page }) => {
  const author = await registerAccount(page, '发布');
  const trip = await createCompletedTrip(page, author.userId, `完成行程 ${Date.now()}`);

  await useAccount(page, author);
  await page.goto(`/#/users/${author.userId}`);
  await expect(page.locator('.growth-progress .gp-top b')).toHaveText('0 / 100 EXP');

  await publishExperience(page, author.userId, trip.id);
  await page.reload();
  await expect(page.locator('.growth-progress .gp-top b')).toHaveText('10 / 100 EXP');
  await expect(page.locator('.growth-progress .gp-hint')).toContainText('今日经验 10 / 20');

  // R3：成长事件只写成长账本，不改信用分。
  expect(await creditScore(page, author.userId)).toBe(80);
});

test('E3 举报成立后本人等级回退可见', async ({ page }) => {
  const author = await registerAccount(page, '被举报');
  const reporter = await registerAccount(page, '举报人');
  seedExp(author.userId, 300);

  const created = await page.request.post(`${API}/reports`, {
    headers: WRITE(reporter.userId),
    data: {
      target_type: 'user',
      target_id: author.userId,
      reason: 'other',
      note: 'E2E：成长回退',
    },
  });
  expect(created.status()).toBe(201);
  const list = await page.request.get(`${API}/help/reports`, {
    headers: BEARER(reporter.token),
  });
  const items = ((await list.json()) as {
    items: { id: number; target_id: number; status: string }[];
  }).items;
  const report = items.find((item) => item.target_id === author.userId && item.status === 'PENDING');
  expect(report, 'report should be pending').toBeTruthy();

  const admin = await loginAsAdmin(page);
  const started = await page.request.post(`${API}/admin/reports/${report!.id}/start`, {
    headers: BEARER(admin.token),
  });
  expect(started.ok()).toBeTruthy();
  const resolved = await page.request.post(`${API}/admin/reports/${report!.id}/resolve`, {
    headers: { ...BEARER(admin.token), 'Content-Type': 'application/json' },
    data: { outcome: 'RESOLVED', note: 'E2E：成长回退', violation_type: 'HARASSMENT' },
  });
  expect(resolved.ok()).toBeTruthy();

  const growth = await readProfileGrowth(page, author.userId, author.userId);
  expect(growth.exp).toBe(250);
  expect(growth.level).toBe(3);

  await useAccount(page, author);
  await page.goto(`/#/users/${author.userId}`);
  await expect(page.locator('.profile-hero-meta .growth-pill').first()).toContainText('LV3');
  await expect(page.locator('.growth-progress .gp-top b')).toHaveText('250 / 300 EXP');
});

test('E4–E7 行程卡 / 详情发布者 / 申请者行 / 同行者卡片显示 LVn', async ({ page }) => {
  const publisher = await registerAccount(page, '发布者');
  const companion = await registerAccount(page, '同行者');
  const applicant = await registerAccount(page, '申请者');
  seedExp(publisher.userId, 240);

  const title = `成长展示 ${Date.now()}`;
  const trip = await createFutureTrip(page, publisher.userId, title, 3);
  await applyViaApi(page, companion.userId, trip.id, '想一起走。');
  await acceptApplicationViaApi(page, publisher.userId, trip.id, companion.userId);
  await applyViaApi(page, applicant.userId, trip.id, '还想加入。');

  // 首页行程卡：发布者 LV3。
  await useAccount(page, companion);
  await page.goto('/');
  const card = page.locator('.trip-card', { hasText: title });
  await expect(card.locator('.growth-pill').first()).toContainText('LV3');

  // 详情发布者区 + 同行者卡片。
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.locator('.publisher-body .growth-pill').first()).toContainText('LV3');
  const companionPill = page
    .locator('.companion-card', { hasText: companion.nickname })
    .locator('.growth-pill');
  await expect(companionPill).toContainText('LV1');

  // 申请处理页：申请者行。
  await useAccount(page, publisher);
  await page.goto(`/#/trips/${trip.id}/applications`);
  const applicantRow = page.locator('.application-list li', { hasText: applicant.nickname });
  await expect(applicantRow.locator('.growth-pill')).toContainText('LV1');
});

test('R1/R2 无经验明细 / 排行榜 / 通知 / 管理端成长视图与客户端写入口', async ({ page }) => {
  const account = await registerAccount(page, '反向');

  for (const path of [
    '/api/growth/leaderboard',
    `/api/users/${account.userId}/growth/ledger`,
    '/api/notifications/growth',
  ]) {
    const response = await page.request.get(path, { headers: WRITE(account.userId) });
    expect(response.status(), `${path} should not exist`).toBe(404);
  }

  const admin = await loginAsAdmin(page);
  const adminGrowth = await page.request.get(`${API}/admin/growth`, {
    headers: BEARER(admin.token),
  });
  expect(adminGrowth.status()).toBe(404);

  // R2：成长只读，客户端没有写入口。
  for (const method of ['post', 'put'] as const) {
    const response = await page.request[method](`${API}/users/growth`, {
      headers: WRITE(account.userId),
    });
    expect(response.status(), `${method.toUpperCase()} /users/growth should be 405`).toBe(405);
  }
  const perUser = await page.request.post(`${API}/users/${account.userId}/growth`, {
    headers: WRITE(account.userId),
  });
  expect(perUser.status()).toBe(404);

  // 非目标展示面：页面不出现成长明细 / 排行榜 / 管理端成长视图。
  await useAccount(page, account);
  for (const path of ['/#/growth', '/#/leaderboard', '/#/admin/growth']) {
    await page.goto(path);
    await expect(page.getByText(/成长明细|经验明细|成长排行榜|成长记录/)).toHaveCount(0);
  }
});
