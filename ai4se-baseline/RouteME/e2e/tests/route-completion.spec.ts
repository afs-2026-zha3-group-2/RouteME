import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { verifyStudentViaApi } from './support';

// 路线完成度（S32 / REQ-031）：只在个人主页 hero 出现，文案只由后端状态码决定。
const API = '/api';
const PASSWORD = 'route-completion-pass-123';

type Account = { id: number; token: string; nickname: string };

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

async function registerViaApi(page: Page, nickname = `完成度${uniqueSuffix()}`): Promise<Account> {
  const response = await page.request.post(`${API}/auth/register`, {
    data: {
      username: `rc${uniqueSuffix()}`,
      password: PASSWORD,
      nickname,
    },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { token: string; user: { id: number; nickname: string } };
  await verifyStudentViaApi(page, session);
  return { id: session.user.id, token: session.token, nickname: session.user.nickname };
}

async function completeProfileViaApi(page: Page, account: Account): Promise<void> {
  const response = await page.request.put(`${API}/users/me/profile`, {
    headers: { Authorization: `Bearer ${account.token}` },
    data: {
      nickname: account.nickname,
      birthday: '2003-05-18',
      gender: '女',
      city: '广州',
      interests: ['摄影', '美食', '徒步'],
      travel_style: '深度游',
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function useAccount(page: Page, account: Account): Promise<void> {
  await page.addInitScript(
    ({ id, token }) => {
      window.localStorage.setItem('routeme.currentUserId', String(id));
      window.localStorage.setItem('routeme.authToken', token);
    },
    { id: account.id, token: account.token },
  );
}

/** 只改写完成度两字段，其余资料透传真实响应，避免夹具漂移。 */
async function stubCompletion(page: Page, state: string, rate: number | null): Promise<void> {
  await page.route('**/api/users/*/profile', async (route) => {
    try {
      const response = await route.fetch();
      const payload = (await response.json()) as Record<string, unknown>;
      delete payload.route_completion_rate;
      payload.route_completion_state = state;
      if (rate !== null) {
        payload.route_completion_rate = rate;
      }
      await route.fulfill({ response, json: payload });
    } catch {
      // 测试收尾时仍在途的 profile 请求：忽略竞态；真实失败仍由页面断言暴露。
    }
  });
}

async function openProfile(page: Page, userId: number): Promise<void> {
  await page.goto(`/#/users/${userId}`);
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
}

test('real data shows the dash row for self and other views', async ({ page }) => {
  const publisher = await registerViaApi(page);
  await completeProfileViaApi(page, publisher);
  const viewer = await registerViaApi(page);

  await useAccount(page, viewer);
  await openProfile(page, publisher.id);
  const otherRow = page.locator('.profile-completion');
  await expect(otherRow).toHaveText('路线完成度 -');
  await expect(otherRow).toHaveClass(/is-muted/);
  await expect(otherRow).not.toContainText('%');

  // 本人视角同一口径：无样本就没有百分比，也没有编辑 / 隐藏开关。
  await openProfile(page, viewer.id);
  const selfRow = page.locator('.profile-completion');
  await expect(selfRow).toHaveText('路线完成度 -');
  await expect(selfRow).toHaveClass(/is-muted/);
  await expect(selfRow).not.toContainText('%');
});

test('good shows the percent plus the reputation label', async ({ page }) => {
  const account = await registerViaApi(page);
  await completeProfileViaApi(page, account);
  await stubCompletion(page, 'good', 85);
  await useAccount(page, account);

  await openProfile(page, account.id);
  const row = page.locator('.profile-completion');
  await expect(row).toHaveText('路线完成度 85% · 信誉良好');
  await expect(row).toHaveClass(/is-good/);
});

test('neutral shows only the percent', async ({ page }) => {
  const account = await registerViaApi(page);
  await completeProfileViaApi(page, account);
  await stubCompletion(page, 'neutral', 75);
  await useAccount(page, account);

  await openProfile(page, account.id);
  const row = page.locator('.profile-completion');
  await expect(row).toHaveText('路线完成度 75%');
  await expect(row).toHaveClass(/is-fair/);
});

test('watch uses the soft wording and never judges the user', async ({ page }) => {
  const account = await registerViaApi(page);
  await completeProfileViaApi(page, account);
  await stubCompletion(page, 'watch', 55);
  await useAccount(page, account);

  await openProfile(page, account.id);
  const row = page.locator('.profile-completion');
  await expect(row).toHaveText('路线完成度 55% · 请留意行程完成情况');
  await expect(row).toHaveClass(/is-watch/);
  await expect(page.locator('body')).not.toContainText(/骗子|危险用户|不可信/);
});

test('the wording follows the backend state code, not a local threshold', async ({ page }) => {
  // 85 若在前端按阈值判断会被当成 good；这里状态码是 neutral，文案必须只显示百分比。
  const account = await registerViaApi(page);
  await completeProfileViaApi(page, account);
  await stubCompletion(page, 'neutral', 85);
  await useAccount(page, account);

  await openProfile(page, account.id);
  const row = page.locator('.profile-completion');
  await expect(row).toHaveText('路线完成度 85%');
  await expect(row).not.toContainText('信誉良好');

  // 静态反向：展示模块里不存在 80 / 70 阈值常量或二次计算。
  const source = readFileSync(
    new URL('../../frontend/src/profile/routeCompletionDisplay.ts', import.meta.url),
    'utf8',
  );
  expect(source).not.toMatch(/\b(80|70)\b/);
});

test('keeps the completion row off the home list, cards, modal and trip detail', async ({ page }) => {
  const publisher = await registerViaApi(page, `发布者${uniqueSuffix()}`);
  await completeProfileViaApi(page, publisher);
  const title = `完成度入口 ${uniqueSuffix()}`;
  const tripResponse = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisher.id), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(tripResponse.ok()).toBeTruthy();
  const tripId = ((await tripResponse.json()) as { id: number }).id;

  const viewer = await registerViaApi(page);
  await useAccount(page, viewer);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#main-content')).not.toContainText('路线完成度');

  await page.locator('#filter-sort').click();
  await page.locator('.soft-select-option', { hasText: '按最新发布' }).click();
  const card = page.locator('.trip-card', { hasText: title });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('路线完成度');

  await card.getByRole('button', { name: `查看 ${publisher.nickname} 的资料` }).click();
  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(modal).not.toContainText('路线完成度');
  await modal.locator('.ant-modal-footer button').click();
  await expect(modal).toBeHidden();

  await page.goto(`/#/trips/${tripId}`);
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('#main-content')).not.toContainText('路线完成度');
});

test('publisher declares completed stops and the profile aggregates real rates', async ({ page }) => {
  const account = await registerViaApi(page);
  await completeProfileViaApi(page, account);
  await useAccount(page, account);

  const today = new Date().toISOString().slice(0, 10);
  const createOngoingTrip = async (title: string): Promise<number> => {
    const response = await page.request.post(`${API}/trips`, {
      headers: { 'X-User-Id': String(account.id) },
      data: {
        title,
        destination_code: '440400',
        start_date: today,
        end_date: today,
        stops: ['香洲港集合', '情侣路骑行'],
        capacity: 3,
      },
    });
    expect(response.status()).toBe(201);
    return ((await response.json()) as { id: number }).id;
  };
  const endTrip = async (tripId: number, uncheckStop?: string): Promise<void> => {
    await page.goto(`/#/trips/${tripId}`);
    await page.getByRole('button', { name: '结束行程' }).click();
    const modal = page.locator('.ant-modal', { hasText: '实际完成的途经点' });
    await expect(modal).toBeVisible();
    await expect(modal.locator('.ant-checkbox-wrapper')).toHaveCount(2);
    // 默认全选；可选取消某个途经点。
    await expect(modal.locator('.ant-checkbox-checked')).toHaveCount(2);
    if (uncheckStop !== undefined) {
      await modal.locator('.ant-checkbox-wrapper', { hasText: uncheckStop }).click();
    }
    await modal.locator('.ant-modal-footer button', { hasText: '结束行程' }).click();
    await expect(modal).toBeHidden();
  };

  // 第一程只完成 1/2 → 50% watch。
  const first = await createOngoingTrip(`完成度闭环一 ${uniqueSuffix()}`);
  await endTrip(first, '情侣路骑行');
  await openProfile(page, account.id);
  const row = page.locator('.profile-completion');
  await expect(row).toHaveText('路线完成度 50% · 请留意行程完成情况');
  await expect(row).toHaveClass(/is-watch/);

  // 第二程全部完成 → (1+2)/(2+2) = 75% neutral。
  const second = await createOngoingTrip(`完成度闭环二 ${uniqueSuffix()}`);
  await endTrip(second);
  await openProfile(page, account.id);
  await expect(row).toHaveText('路线完成度 75%');
  await expect(row).toHaveClass(/is-fair/);
});
