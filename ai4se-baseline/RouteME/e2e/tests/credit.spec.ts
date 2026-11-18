import { expect, test, type Page } from '@playwright/test';
import { applyViaApi, createTripViaApi, loginAs, verifyStudentViaApi } from './support';

const API = process.env.ROUTEME_E2E_API_BASE ? `${process.env.ROUTEME_E2E_API_BASE}/api` : '/api';
const PASSWORD = 'credit-pass-123';

type Account = { username: string; userId: number; token: string };

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}

async function registerViaApi(page: Page): Promise<Account> {
  const username = `credit${uniqueSuffix()}`;
  const response = await page.request.post(`${API}/auth/register`, {
    data: { username, password: PASSWORD, nickname: `信用${uniqueSuffix()}` },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { token: string; user: { id: number } };
  await verifyStudentViaApi(page, session);
  return { username, userId: session.user.id, token: session.token };
}

/** 按既有 E2E 约定把身份写进 localStorage，再落到首页。 */
async function useAccount(page: Page, account: { userId: number; token: string | null }): Promise<void> {
  await page.addInitScript(
    ({ id, token }) => {
      window.localStorage.setItem('routeme.currentUserId', String(id));
      if (token === null) {
        window.localStorage.removeItem('routeme.authToken');
      } else {
        window.localStorage.setItem('routeme.authToken', token);
      }
    },
    { id: account.userId, token: account.token },
  );
  await page.goto('/');
}

test('shows the initial credit line on a newly registered profile and keeps it after refresh', async ({ page }) => {
  const account = await registerViaApi(page);
  await useAccount(page, account);

  await page.goto(`/#/users/${account.userId}`);
  const credit = page.locator('.profile-credit');
  await expect(credit).toHaveText('信用分：80 / 100 · 信用良好');
  await expect(credit).toHaveClass(/is-good/);

  await page.reload();
  await expect(page.locator('.profile-credit')).toHaveText('信用分：80 / 100 · 信用良好');
});

test('shows the same credit line to another viewer', async ({ page }) => {
  await useAccount(page, { userId: 1, token: null });

  await page.goto('/#/users/3');
  await expect(page.locator('.profile-credit')).toHaveText('信用分：80 / 100 · 信用良好');
});

test('keeps the credit line visible before the profile is completed', async ({ page }) => {
  const account = await registerViaApi(page);
  await useAccount(page, account);

  await page.goto(`/#/users/${account.userId}`);
  await expect(page.getByText('资料未完善').first()).toBeVisible();
  await expect(page.locator('.profile-credit')).toHaveText('信用分：80 / 100 · 信用良好');
});

test('does not expose credit details, admin surfaces or credits outside the listed surfaces', async ({ page }) => {
  await useAccount(page, { userId: 1, token: null });

  await page.goto('/#/users/2');
  await expect(page.locator('.profile-credit')).toBeVisible();
  await expect(page.getByText(/信用明细|加分记录|扣分记录|信用历史/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /查看明细|查看历史/ })).toHaveCount(0);
  await expect(page.getByText('管理后台')).toHaveCount(0);

  const adminResponse = await page.request.get(`${API}/admin/users`);
  expect([401, 403]).toContain(adminResponse.status());

  await page.goto('/#/mine');
  await expect(page.locator('.profile-credit')).toHaveCount(0);
});

test('shows the credit line in the profile modal', async ({ page }) => {
  await loginAs(page, 3);
  await page.goto('/');

  // 共享库里种子卡可能被新行程挤出首屏，取当前第一张卡验证弹窗信用行即可。
  const card = page.locator('.trip-card').first();
  await expect(card).toBeVisible();
  await card.locator('.tc-host').click();
  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  // 首卡发布者可能是学习/退出用例造的账号，只锁信用行的格式与分值口径。
  await expect(modal.locator('.profile-credit')).toContainText(/信用分：\d+ \/ 100 · /);
});

test('shows the publisher credit on the trip detail page', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/3');

  await expect(page.locator('.publisher-credit')).toHaveText('信用分：80 / 100 · 信用良好');
});

test('shows the credit line on home trip cards', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.locator('.tc-credit').first()).toHaveText('信用分：80 / 100 · 信用良好');
});

test('shows the applicant credit on the applications page', async ({ page }) => {
  const trip = await createTripViaApi(page, 1, `信用申请 ${Date.now()}`);
  const applicant = await registerViaApi(page);
  await applyViaApi(page, applicant.userId, trip.id, null);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${trip.id}/applications`);
  await expect(page.locator('.profile-credit').first()).toHaveText('信用分：80 / 100 · 信用良好');
});

test('awards credit for experience likes without exposing any history', async ({ page }) => {
  const author = await registerViaApi(page);
  const trip = await createTripViaApi(page, author.userId, `信用获赞行程 ${Date.now()}`);
  const completed = await page.request.post(`${API}/trips/${trip.id}/complete`, {
    headers: { 'X-User-Id': String(author.userId) },
  });
  expect(completed.ok()).toBeTruthy();

  const shared = await page.request.post(`${API}/trips/${trip.id}/experiences`, {
    headers: { 'X-User-Id': String(author.userId), 'Content-Type': 'application/json' },
    data: {
      content: `获赞信用验证：路线平缓，日落机位要早到。${Date.now()}`,
      intensity: 'relaxed',
      advice: '带一瓶水就够。',
    },
  });
  expect(shared.ok()).toBeTruthy();
  const experience = (await shared.json()) as { id: number };

  for (let index = 0; index < 5; index += 1) {
    const liker = await registerViaApi(page);
    const liked = await page.request.post(`${API}/experiences/${experience.id}/likes`, {
      headers: { 'X-User-Id': String(liker.userId) },
    });
    expect(liked.status()).toBe(201);
  }

  const profile = await page.request.get(`${API}/users/${author.userId}/profile`, {
    headers: { 'X-User-Id': String(author.userId) },
  });
  expect(profile.ok()).toBeTruthy();
  const body = (await profile.json()) as { credit_score: number; credit_level: string };
  expect(body.credit_score).toBe(81);
  expect(body.credit_level).toBe('good');

  await useAccount(page, author);
  await page.goto(`/#/users/${author.userId}`);
  await expect(page.locator('.profile-credit')).toHaveText('信用分：81 / 100 · 信用良好');
  await expect(page.getByText(/信用明细|加分记录|扣分记录|信用历史/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /查看明细|查看历史/ })).toHaveCount(0);
  await expect(page.getByText('管理后台')).toHaveCount(0);
});
