import { expect, test, type Page } from '@playwright/test';
import { applyViaApi, createTripViaApi, loginAs } from './support';

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
  expect(adminResponse.status()).toBe(404);

  await page.goto('/#/mine');
  await expect(page.locator('.profile-credit')).toHaveCount(0);
});

test('shows the credit line in the profile modal', async ({ page }) => {
  await loginAs(page, 3);
  await page.goto('/');

  await page.locator('.trip-card', { hasText: '上海武康路咖啡散步' }).locator('.tc-host').click();
  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(modal.locator('.profile-credit')).toHaveText('信用分：80 / 100 · 信用良好');
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
