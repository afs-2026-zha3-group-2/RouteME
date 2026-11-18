import { expect, test, type Page } from '@playwright/test';
import { applyViaApi, createTripViaApi } from './support';
import { registerViaApi, useAccount } from './creditSupport';

/**
 * E2：五展示面「限制中」徽标 + 本人原因 + 他人不看原因 + 各入口拦截提示。
 * 后端真实守卫由 API 测试覆盖；这里用 route 模拟信用响应，避免新增管理员/测试写接口。
 */

type CreditEntry = {
  user_id: number;
  credit_score: number;
  credit_level: string;
  credit_restricted: boolean;
};

async function mockRestrictedCredit(page: Page, restrictedIds: number[]) {
  await page.route('**/api/users/credits**', async (route) => {
    const response = await route.fetch();
    const entries = (await response.json()) as CreditEntry[];
    await route.fulfill({
      response,
      json: entries.map((entry) =>
        restrictedIds.includes(entry.user_id)
          ? { ...entry, credit_score: 55, credit_level: 'risk', credit_restricted: true }
          : entry,
      ),
    });
  });
  await page.route('**/api/users/*/profile', async (route) => {
    const match = /\/users\/(\d+)\/profile$/.exec(new URL(route.request().url()).pathname);
    const response = await route.fetch();
    const profile = (await response.json()) as Record<string, unknown>;
    const restricted = restrictedIds.includes(Number(match?.[1]));
    await route.fulfill({
      response,
      json: restricted
        ? {
            ...profile,
            credit_score: 55,
            credit_level: 'risk',
            credit_restricted: true,
            credit_restriction_reason: null,
          }
        : profile,
    });
  });
}

test('shows the restriction badge on five surfaces and hides the reason from others', async ({ page }) => {
  const viewer = await registerViaApi(page, '观察者');
  await mockRestrictedCredit(page, [2, 3]);
  await useAccount(page, viewer);

  // 1. 受限用户主页（他人视角）：徽标但不渲染原因
  await page.goto('/#/users/2');
  await expect(page.locator('.profile-credit .credit-restricted-badge')).toHaveText('限制中');
  await expect(page.locator('.restriction-note')).toHaveCount(0);

  // 2. 首页行程卡
  await page.goto('/');
  await expect(
    page.locator('.trip-card .tc-credit .credit-restricted-badge').first(),
  ).toHaveText('限制中');

  // 3. 行程详情发布者行
  await page.goto('/#/trips/3');
  await expect(page.locator('.publisher-credit .credit-restricted-badge')).toHaveText('限制中');

  // 4. 资料弹窗（从带受限徽标的卡片进入）
  await page.goto('/');
  await page
    .locator('.trip-card')
    .filter({ has: page.locator('.credit-restricted-badge') })
    .first()
    .locator('.tc-host')
    .click();
  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(modal.locator('.credit-restricted-badge')).toHaveText('限制中');

  // 5. 申请列表（受限用户作为申请者）
  const trip = await createTripViaApi(page, viewer.userId, `限制申请列表 ${Date.now()}`);
  await applyViaApi(page, 2, trip.id, '想一起走。');
  await page.goto(`/#/trips/${trip.id}/applications`);
  await expect(page.locator('.application-list .credit-restricted-badge').first()).toHaveText(
    '限制中',
  );
});

test('restricted account only sees the learning gate on every route', async ({ page }) => {
  const self = await registerViaApi(page, '受限');
  await mockRestrictedCredit(page, [self.userId]);
  await useAccount(page, self);

  const hostTrip = await createTripViaApi(page, 2, `限制申请 ${Date.now()}`);
  const ownTrip = await createTripViaApi(page, self.userId, `限制处理 ${Date.now()}`);

  const routes = [
    '/',
    '/#/trips/new',
    '/#/profile/setup',
    `/#/trips/${hostTrip.id}`,
    `/#/trips/${ownTrip.id}/applications`,
    '/#/chat',
    '/#/mine',
  ];
  for (const path of routes) {
    await page.goto(path);
    const gate = page.locator('.credit-gate');
    await expect(gate).toBeVisible();
    await expect(gate).toContainText('账号功能已暂停');
    await expect(gate).toContainText('当前信用分 55 / 100');
    await expect(page.locator('.blocked-notice')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^发\s*布/ })).toHaveCount(0);
  }

  // 侧栏仍在，门禁可直接进学习页；学习页不套门禁。
  await page.goto('/');
  await expect(page.locator('.rail-link').first()).toBeVisible();
  await page.locator('.credit-gate').getByRole('link', { name: '去安全学习' }).click();
  await expect(page).toHaveURL(/#\/credit\/learning$/);
  await expect(page.locator('.credit-gate')).toHaveCount(0);
});
