import { expect, test, type Page } from '@playwright/test';

const API = '/api';
const PASSWORD = 'verify-pass-123';

type Account = { userId: number; token: string };

async function registerUnverified(page: Page): Promise<Account> {
  const username = `verify${Date.now().toString(36)}`;
  const response = await page.request.post(`${API}/auth/register`, {
    data: { username, password: PASSWORD, nickname: `待认证${Date.now().toString().slice(-6)}` },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as {
    token: string;
    user: { id: number; student_verified: boolean };
  };
  expect(session.user.student_verified).toBe(false);
  return { userId: session.user.id, token: session.token };
}

async function useAccount(page: Page, account: Account): Promise<void> {
  await page.goto('/');
  await page.evaluate((value) => {
    window.localStorage.setItem('routeme.currentUserId', String(value.userId));
    window.localStorage.setItem('routeme.authToken', value.token);
  }, account);
  await page.reload();
}

test('blocks the publish page by direct link and routes to verification', async ({ page }) => {
  const account = await registerUnverified(page);
  await useAccount(page, account);

  await page.goto('/#/trips/new');
  await expect(page.getByRole('heading', { name: '这个页面需要学信网认证' })).toBeVisible();
  await expect(page.locator('.chsi-required-card')).toBeVisible();

  await page.getByRole('button', { name: '去认证' }).click();
  await expect(page).toHaveURL(/#\/verify\/student$/);
  await expect(page.getByRole('heading', { name: '先确认你是在校大学生，再一起出发' })).toBeVisible();
});

test('gates applying until CHSI verification, then unlocks core actions', async ({ page }) => {
  const account = await registerUnverified(page);
  await useAccount(page, account);

  // 未认证横幅 + 申请入口弹窗。
  await expect(page.locator('.chsi-banner')).toContainText('学信网学籍认证未完成');
  await page.goto('/#/trips/7');
  await expect(page.getByRole('heading', { name: '上海武康路咖啡散步' })).toBeVisible();
  await page.getByRole('button', { name: '提交同行申请' }).click();
  const modal = page.locator('.ant-modal', { hasText: '需要先完成学信网认证' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: '去认证' }).click();
  await expect(page).toHaveURL(/#\/verify\/student$/);

  // 服务端仍拒绝未认证账号的申请请求。
  const rejected = await page.request.post(`${API}/trips/7/applications`, {
    headers: { 'X-User-Id': String(account.userId), 'Content-Type': 'application/json' },
    data: { message: '未认证申请应被拒绝' },
  });
  expect(rejected.status()).toBe(403);
  expect(((await rejected.json()) as { code: string }).code).toBe('STUDENT_VERIFICATION_REQUIRED');

  // 提交演示核验。
  await page.locator('#chsi-name').fill('张三');
  await page.locator('#chsi-school').fill('中山大学');
  await page.locator('#chsi-code').fill('AB12CD34EF56');
  await page.getByRole('button', { name: '提交认证' }).click();

  await expect(page.getByText('认证通过，核心功能已解锁')).toBeVisible();
  await expect(page.getByRole('heading', { name: '已通过学信网学籍认证' })).toBeVisible();
  await expect(page.locator('.chsi-facts')).toContainText('中山大学');

  // 横幅消失，再次申请不再弹窗并成功提交。
  await page.goto('/#/trips/7');
  await expect(page.locator('.chsi-banner')).toHaveCount(0);
  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.getByText(/申请已提交，等待/)).toBeVisible();
  await expect(page.locator('.ant-modal', { hasText: '需要先完成学信网认证' })).toHaveCount(0);
});

test('shows the new school immediately after re-verification without a reload', async ({ page }) => {
  const account = await registerUnverified(page);
  await useAccount(page, account);
  const first = await page.request.post(`${API}/users/me/student-verification`, {
    headers: { Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' },
    data: { name: '张三', school: '中山大学', code: 'AB12CD34EF56' },
  });
  expect(first.ok()).toBeTruthy();

  // 重新加载会话，让前端拿到已认证状态；后续不再刷新页面。
  await page.reload();
  await page.goto('/#/verify/student');
  await expect(page.getByRole('heading', { name: '已通过学信网学籍认证' })).toBeVisible();
  await expect(page.locator('.chsi-facts')).toContainText('中山大学');

  await page.getByRole('button', { name: '重新认证' }).click();
  await page.locator('#chsi-name').fill('张三');
  await page.locator('#chsi-school').fill('华南理工大学');
  await page.locator('#chsi-code').fill('ZX12CV34BN56');
  await page.getByRole('button', { name: '提交认证' }).click();

  await expect(page.getByText('认证通过，核心功能已解锁')).toBeVisible();
  await expect(page.locator('.chsi-facts')).toContainText('华南理工大学');
  await expect(page.locator('.chsi-facts')).not.toContainText('中山大学');
});
