import { expect, test, type Page } from '@playwright/test';
import {
  API,
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
} from './support';
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

async function mockRestrictedCredit(page: Page, selfId: number) {
  await page.route('**/api/users/credits**', async (route) => {
    const response = await route.fetch();
    const entries = (await response.json()) as CreditEntry[];
    await route.fulfill({
      response,
      json: entries.map((entry) => ({
        ...entry,
        credit_score: 55,
        credit_level: 'risk',
        credit_restricted: true,
      })),
    });
  });
  await page.route('**/api/users/*/profile', async (route) => {
    const match = /\/users\/(\d+)\/profile$/.exec(new URL(route.request().url()).pathname);
    const response = await route.fetch();
    const profile = (await response.json()) as Record<string, unknown>;
    const isSelf = Number(match?.[1]) === selfId;
    await route.fulfill({
      response,
      json: {
        ...profile,
        credit_score: 55,
        credit_level: 'risk',
        credit_restricted: true,
        credit_restriction_reason: isSelf ? 'CREDIT_SCORE_BELOW_60' : null,
      },
    });
  });
}

test('shows the restriction badge on five surfaces and hides the reason from others', async ({ page }) => {
  const self = await registerViaApi(page, '受限');
  await mockRestrictedCredit(page, self.userId);
  await useAccount(page, self);

  // 1. 本人个人主页：徽标 + 原因 + 自动解除
  await page.goto(`/#/users/${self.userId}`);
  const ownCredit = page.locator('.profile-credit');
  await expect(ownCredit.locator('.credit-restricted-badge')).toHaveText('限制中');
  await expect(page.locator('.restriction-note')).toContainText(
    '信用分低于 60，原因：CREDIT_SCORE_BELOW_60。',
  );
  await expect(page.locator('.restriction-note')).toContainText('分数回到 60 分及以上自动解除。');

  // 他人主页：只有徽标，不渲染原因
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

  // 4. 资料弹窗
  await page.goto('/');
  await page.locator('.trip-card .tc-host').first().click();
  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(modal.locator('.credit-restricted-badge')).toHaveText('限制中');

  // 5. 申请列表
  const trip = await createTripViaApi(page, self.userId, `限制申请列表 ${Date.now()}`);
  await applyViaApi(page, 3, trip.id, '想一起走。');
  await page.goto(`/#/trips/${trip.id}/applications`);
  await expect(page.locator('.application-list .credit-restricted-badge').first()).toHaveText(
    '限制中',
  );
});

test('blocks publish, apply, accept, experience, chat and profile edits while restricted', async ({ page }) => {
  const self = await registerViaApi(page, '受限');
  await mockRestrictedCredit(page, self.userId);
  await useAccount(page, self);

  // 发布导航：可见但禁用
  await page.goto('/');
  const publishNav = page.locator('.rail-link', { hasText: '发布行程' });
  await expect(publishNav).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled 会被 Playwright 视为不可点，这里强制点击以验证 preventDefault 生效
  const beforeClick = page.url();
  await publishNav.click({ force: true });
  expect(page.url()).toBe(beforeClick);

  // 发布页：提示 + 提交禁用
  await page.goto('/#/trips/new');
  await expect(page.locator('.blocked-notice')).toContainText(
    '信用分低于 60，当前账号仅可查看；分数回到 60 分及以上自动解除。',
  );
  await expect(page.getByRole('button', { name: /^发\s*布$/ })).toBeDisabled();

  // 资料编辑：提示 + 保存禁用
  await page.goto('/#/profile/setup');
  await expect(page.locator('.blocked-notice')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存资料' })).toBeDisabled();

  // 详情申请区：提示 + 申请禁用
  const hostTrip = await createTripViaApi(page, 2, `限制申请 ${Date.now()}`);
  await page.goto(`/#/trips/${hostTrip.id}`);
  await expect(page.locator('.blocked-notice')).toBeVisible();
  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeDisabled();

  // 申请处理：接受 / 拒绝都禁用
  const ownTrip = await createTripViaApi(page, self.userId, `限制处理 ${Date.now()}`);
  await applyViaApi(page, 3, ownTrip.id, '想一起走。');
  await page.goto(`/#/trips/${ownTrip.id}/applications`);
  await expect(page.locator('.blocked-notice')).toBeVisible();
  await expect(page.getByRole('button', { name: /^接\s*受$/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^拒\s*绝$/ })).toBeDisabled();

  // 聊天输入：历史可读，输入区替换为提示
  await applyViaApi(page, self.userId, hostTrip.id, '想一起走。');
  await acceptApplicationViaApi(page, 2, hostTrip.id, self.userId);
  await page.goto(`/#/chat/${hostTrip.id}/2`);
  await expect(page.locator('.chat-item').first()).toBeVisible();
  await expect(page.locator('.composer-closed .blocked-notice')).toContainText(
    '信用分低于 60，当前账号仅可查看',
  );
  await expect(page.locator('.composer')).toHaveCount(0);

  // 分享体验：提示 + 发布禁用
  const shared = await createTripViaApi(page, 2, `限制体验 ${Date.now()}`);
  await applyViaApi(page, self.userId, shared.id, '想一起走。');
  await acceptApplicationViaApi(page, 2, shared.id, self.userId);
  const completed = await page.request.post(`${API}/trips/${shared.id}/complete`, {
    headers: { 'X-User-Id': '2' },
  });
  expect(completed.ok()).toBeTruthy();
  await page.goto(`/#/share/${shared.id}`);
  await expect(page.locator('.blocked-notice')).toBeVisible();
  await expect(page.getByRole('button', { name: '发布体验' })).toBeDisabled();
});
