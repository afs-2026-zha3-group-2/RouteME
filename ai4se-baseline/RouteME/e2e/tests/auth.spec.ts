import { expect, test, type Page } from '@playwright/test';

const API = '/api';

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

async function openAccountMenu(page: Page) {
  // 登录后不再提供身份切换，顶部入口只描述为「账号菜单」。
  await page.getByRole('button', { name: /账号菜单：/ }).click();
  const menu = page.getByRole('dialog', { name: '账号菜单' });
  await expect(menu).toBeVisible();
  return menu;
}

async function expectIdentityGate(page: Page): Promise<void> {
  await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
  await expect(page.getByLabel('用户名')).toBeVisible();
  // 演示身份直接进入区块已移除，身份门只剩登录 / 注册表单。
  await expect(page.locator('.gate-cards')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /周野/ })).toHaveCount(0);
}

test('hides the demo identity switch list from the identity menu', async ({ page }) => {
  await useIdentity(page, { userId: 1 });
  await page.goto('/');

  const menu = await openAccountMenu(page);

  // 所有种子账号均已落库凭据，菜单不再提供任何身份切换入口。
  await expect(menu.getByRole('listbox')).toHaveCount(0);
  await expect(menu.getByRole('option')).toHaveCount(0);
  await expect(menu.getByRole('button', { name: '退出登录' })).toBeVisible();
  await expect(
    menu.getByText('退出登录会清除本机身份并回到登录页。'),
  ).toBeVisible();
});

test('shows the logout entry for a registered account', async ({ page }) => {
  const account = await createAccount(page);
  await useIdentity(page, { userId: account.userId, token: account.token });
  await page.goto('/');

  // 登录后只能退出再登录，顶部入口不再叫「切换身份」。
  await expect(page.locator('.id-switch-label')).toHaveText('已登录');
  await expect(page.getByRole('button', { name: /切换身份/ })).toHaveCount(0);

  const menu = await openAccountMenu(page);

  await expect(menu.getByText('已登录')).toBeVisible();
  await expect(menu.getByRole('button', { name: '退出登录' })).toBeVisible();
  await expect(
    menu.getByText('退出登录会结束本机会话并回到登录页。'),
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

  const menu = await openAccountMenu(page);
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

  const menu = await openAccountMenu(page);
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

  const menu = await openAccountMenu(page);
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

  const menu = await openAccountMenu(page);
  await menu.getByRole('button', { name: '退出登录' }).click();
  await expectIdentityGate(page);

  await page.goBack();
  await expectIdentityGate(page);

  await page.reload();
  await expectIdentityGate(page);
  await expect(page.getByRole('button', { name: '退出登录' })).toHaveCount(0);
});

test('re-enters with a seeded account after logout', async ({ page }) => {
  await useIdentity(page, { userId: 1 });
  await page.goto('/');

  const menu = await openAccountMenu(page);
  await menu.getByRole('button', { name: '退出登录' }).click();
  await expectIdentityGate(page);

  // 周野已落库凭据（V15），只能通过登录表单重新进入。
  await page.getByLabel('用户名').fill('zhouye');
  await page.getByLabel('密码').fill('123456');
  await page.getByRole('button', { name: /^登\s*录$/ }).click();

  await expect(page.locator('.id-switch-name')).toHaveText('周野');
  await expect(page.getByRole('dialog', { name: '账号菜单' })).toHaveCount(0);
});