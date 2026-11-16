import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';

type RegisteredAccount = {
  username: string;
  token: string;
  userId: number;
};

async function createAccount(page: Page): Promise<RegisteredAccount> {
  const username = `logout_${Date.now()}`;
  const response = await page.request.post(`${API}/auth/register`, {
    data: {
      username,
      password: 'logout-pass-123',
      nickname: '退出测试同学',
      school: '中山大学',
      interests: ['摄影'],
    },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { token: string; user: { id: number } };
  return { username, token: session.token, userId: session.user.id };
}

async function useIdentity(
  page: Page,
  identity: { userId: number; token?: string },
): Promise<void> {
  await page.goto('/');
  await page.evaluate((value) => {
    window.localStorage.setItem('routeme.currentUserId', String(value.userId));
    if (value.token !== undefined) {
      window.localStorage.setItem('routeme.authToken', value.token);
    }
  }, identity);
  await page.reload();
}

async function openIdentityMenu(page: Page) {
  await page.getByRole('button', { name: /切换身份：当前/ }).click();
  const menu = page.getByRole('dialog', { name: '身份菜单' });
  await expect(menu).toBeVisible();
  return menu;
}

async function expectIdentityGate(page: Page): Promise<void> {
  await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
  await expect(page.getByRole('button', { name: /林见夏/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /陈屿/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /苏念/ })).toBeVisible();
}

test('shows the logout entry for a demo identity', async ({ page }) => {
  await useIdentity(page, { userId: 1 });
  await page.goto('/');

  const menu = await openIdentityMenu(page);

  await expect(menu.getByRole('listbox')).toBeVisible();
  await expect(menu.getByRole('option')).toHaveCount(3);
  await expect(menu.getByRole('button', { name: '退出登录' })).toBeVisible();
  await expect(
    menu.getByText('演示身份无需密码；退出登录只清除本机身份并回到身份门。'),
  ).toBeVisible();
});

test('shows the logout entry for a registered account', async ({ page }) => {
  const account = await createAccount(page);
  await useIdentity(page, { userId: account.userId, token: account.token });
  await page.goto('/');

  const menu = await openIdentityMenu(page);

  await expect(menu.getByText('已登录')).toBeVisible();
  await expect(menu.getByRole('button', { name: '退出登录' })).toBeVisible();
  await expect(
    menu.getByText('退出登录会结束本机会话并回到身份门；切换到演示身份会结束当前登录。'),
  ).toBeVisible();
});

test('logs out a demo identity without calling the auth API', async ({ page }) => {
  const logoutRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/auth/logout')) {
      logoutRequests.push(request.url());
    }
  });

  await useIdentity(page, { userId: 1 });
  await page.goto('/');

  const menu = await openIdentityMenu(page);
  await menu.getByRole('button', { name: '退出登录' }).click();

  await expectIdentityGate(page);
  expect(logoutRequests).toEqual([]);
  const storedUserId = await page.evaluate(() =>
    window.localStorage.getItem('routeme.currentUserId'),
  );
  expect(storedUserId).toBeNull();
});

test('logs out a registered account and rejects the old token', async ({ page }) => {
  const account = await createAccount(page);
  await useIdentity(page, { userId: account.userId, token: account.token });
  await page.goto('/');

  const menu = await openIdentityMenu(page);
  await menu.getByRole('button', { name: '退出登录' }).click();

  await expectIdentityGate(page);
  await expect
    .poll(async () => {
      const response = await page.request.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${account.token}` },
      });
      return response.status();
    })
    .toBe(401);
});

test('still logs out locally when session revocation fails', async ({ page }) => {
  const account = await createAccount(page);
  await useIdentity(page, { userId: account.userId, token: account.token });
  await page.route('**/api/auth/logout', (route) => route.abort());
  await page.goto('/');

  const menu = await openIdentityMenu(page);
  await menu.getByRole('button', { name: '退出登录' }).click();

  await expectIdentityGate(page);
  await expect(page.getByText('已退出本机，会话可能仍有效').first()).toBeVisible();
  const storedToken = await page.evaluate(() => window.localStorage.getItem('routeme.authToken'));
  expect(storedToken).toBeNull();
});

test('stays on the identity gate after logout, refresh, and navigation', async ({ page }) => {
  await useIdentity(page, { userId: 1 });
  await page.goto('/');

  await page.getByRole('link', { name: '我的旅行' }).click();
  await expect(page).toHaveURL(/#\/mine$/);
  await page.getByRole('link', { name: '旅行灵感' }).click();
  await expect(page).toHaveURL(/#\/$/);

  const menu = await openIdentityMenu(page);
  await menu.getByRole('button', { name: '退出登录' }).click();
  await expectIdentityGate(page);

  await page.goBack();
  await expectIdentityGate(page);

  await page.reload();
  await expectIdentityGate(page);
  await expect(page.getByRole('button', { name: '退出登录' })).toHaveCount(0);
});

test('re-enters with another identity after logout', async ({ page }) => {
  await useIdentity(page, { userId: 1 });
  await page.goto('/');

  const menu = await openIdentityMenu(page);
  await menu.getByRole('button', { name: '退出登录' }).click();
  await expectIdentityGate(page);

  await page.getByRole('button', { name: /陈屿/ }).click();

  await expect(page.locator('.id-switch-name')).toHaveText('陈屿');
  await expect(page.getByRole('dialog', { name: '身份菜单' })).toHaveCount(0);
});