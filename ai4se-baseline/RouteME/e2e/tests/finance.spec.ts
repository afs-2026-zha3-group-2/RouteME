import { expect, test, type Page } from '@playwright/test';
import { createTripViaApi, createUserViaApi, loginAsAccount } from './support';

const API = '/api';

/** 新账号的钱包固定从 1,000,000 分（¥10,000.00）开始。 */
const INITIAL_BALANCE = '¥10,000.00';
const AFTER_LOAN = '¥10,950.00';
/** 还清后余额 = 初始余额 − 5% 服务费（50 元）。 */
const AFTER_REPAY = '¥9,950.00';

async function expectBalance(page: Page, value: string) {
  await expect(page.getByTestId('wallet-balance')).toHaveText(value);
}

/** 昵称上限 20 字符，用 6 位时间后缀保证唯一且不超长。 */
function nickname(prefix: string): string {
  return `${prefix}_${Date.now().toString().slice(-6)}`;
}

test('publisher opens third-party insurance, syncs the state, borrows and repays', async ({
  page,
}) => {
  const account = await createUserViaApi(page, nickname('finance'));
  const trip = await createTripViaApi(page, account.id, `旅行保障演示 ${Date.now()}`);
  await loginAsAccount(page, account);

  // 左侧栏「我的旅行」下方常驻旅行保障入口，直达账号聚合页。
  const railFinance = page.locator('.rail-link[href="#/finance"]');
  await expect(railFinance).toBeVisible();
  await expect(railFinance).toHaveText('旅行保障');

  // 行程详情的「旅行安全保障」区：发布者可见，初始为未购买。
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByRole('heading', { name: '旅行安全保障' })).toBeVisible();
  await expect(page.getByTestId('trip-insurance-status')).toContainText('未购买');
  await expect(page.getByText('为本次同行旅行增加一份额外保障')).toBeVisible();
  await page.getByRole('button', { name: '查看旅行保险' }).click();

  // 行程保障页：行程上下文、提供方与保障类别都可见，钱包不因保险变化。
  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}/finance$`));
  await expectBalance(page, INITIAL_BALANCE);
  await expect(page.getByRole('heading', { name: '旅行保险' })).toBeVisible();
  await expect(page.getByTestId('insurance-status')).toContainText('未购买');
  await expect(page.getByTestId('insurance-provider')).toContainText('第三方保险机构');
  for (const product of ['意外伤害与意外医疗', '紧急救援', '行李与旅行相关保障']) {
    await expect(page.getByText(product)).toBeVisible();
  }
  await expect(page.getByText('RouteMe 仅提供入口，不承保也不参与理赔')).toBeVisible();

  // 点击购买只跳转第三方，不在 RouteMe 扣款或生成记录。
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: '前往第三方购买' }).click(),
  ]);
  expect(popup.url()).toContain('trip_id=');
  await popup.close();
  await expectBalance(page, INITIAL_BALANCE);
  await expect(page.getByTestId('insurance-status')).toContainText('未购买');

  // 第三方确认投保后回写状态：保障中，展示保障期间与保单 / 理赔 / 求助入口。
  await page.getByRole('button', { name: '已完成投保（演示同步）' }).click();
  await expect(page.getByTestId('insurance-status')).toContainText('保障中');
  await expect(page.getByText('保障期间：')).toBeVisible();
  await expect(page.getByRole('link', { name: '查看保单' })).toBeVisible();
  await expect(page.getByRole('link', { name: '理赔指引' })).toBeVisible();
  await expect(page.getByRole('link', { name: '紧急求助' })).toBeVisible();
  await expectBalance(page, INITIAL_BALANCE);

  // 状态持久化到服务端：刷新后仍是保障中，且不再出现「已完成投保」。
  await page.reload();
  await expect(page.getByTestId('insurance-status')).toContainText('保障中');
  await expect(page.getByRole('button', { name: '已完成投保（演示同步）' })).toHaveCount(0);

  // 期限是三档常驻选项（7 / 14 / 30 天），点击即可切换，不需要打开下拉。
  const termGroup = page.getByRole('radiogroup', { name: '期限' });
  await expect(termGroup).toBeVisible();
  await expect(termGroup.locator('.ant-segmented-item')).toHaveText(['7 天', '14 天', '30 天']);
  await termGroup.locator('.ant-segmented-item', { hasText: '7 天' }).click();
  await expect(termGroup.locator('.ant-segmented-item-selected')).toHaveText('7 天');
  await termGroup.locator('.ant-segmented-item', { hasText: '14 天' }).click();
  await expect(termGroup.locator('.ant-segmented-item-selected')).toHaveText('14 天');

  // 借 1,000 元 / 14 天：到账 950.00，应还 1,000.00。
  await expect(page.getByTestId('loan-preview')).toContainText('¥950.00');
  await expect(page.getByTestId('loan-preview')).toContainText('¥1,000.00');
  await page.getByRole('button', { name: '申请借款' }).click();
  await expectBalance(page, AFTER_LOAN);
  await expect(page.getByText('你已有一笔进行中的借款，还清后才能再次申请。')).toBeVisible();

  // 行程详情同步展示保障中状态与紧急求助入口。
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByTestId('trip-insurance-status')).toContainText('保障中');
  await expect(page.getByTestId('trip-insurance-period')).toContainText('保障期间：');
  await expect(page.getByRole('button', { name: '查看保险详情' })).toBeVisible();
  await expect(page.getByRole('button', { name: '紧急求助' })).toBeVisible();

  // 账号聚合页：保险记录、借款与流水都可见，并可从保险记录回到行程保障页。
  await page.locator('.rail-user').click();
  await page.getByRole('menuitem', { name: '旅行保障' }).click();
  await expect(page).toHaveURL(/#\/finance$/);
  await expectBalance(page, AFTER_LOAN);
  await expect(page.getByRole('heading', { name: '保险记录' })).toBeVisible();
  await expect(page.getByText('第三方保险机构', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '钱包流水' })).toBeVisible();

  // 手动还款：扣本金 1,000.00，借款转为已还清。
  await page.getByRole('button', { name: '立即还款' }).click();
  await page.locator('.ant-modal-confirm-btns button.ant-btn-primary').click();
  await expect(page.getByText('已还清').first()).toBeVisible();
  await expectBalance(page, AFTER_REPAY);

  const activeFact = page.locator('.fin-facts div').filter({ hasText: '进行中借款' });
  await expect(activeFact).toContainText('无');

  // 保险记录可回到行程保障页。
  await page.getByRole('link', { name: '查看保障详情' }).first().click();
  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}/finance$`));
  await expect(page.getByTestId('insurance-status')).toContainText('保障中');
});

test('non-participant sees no entry and no insurance or loan actions', async ({ page }) => {
  const publisher = await createUserViaApi(page, nickname('owner'));
  const visitor = await createUserViaApi(page, nickname('visitor'));
  const trip = await createTripViaApi(page, publisher.id, `无资格演示 ${Date.now()}`);

  await loginAsAccount(page, visitor);

  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByRole('heading', { name: '旅行安全保障' })).toHaveCount(0);

  await page.goto(`/#/trips/${trip.id}/finance`);
  await expect(
    page.getByText('只有该行程的发布者或已接受的同行者才能购买保障或借款。'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '前往第三方购买' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '已完成投保（演示同步）' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '申请借款' })).toHaveCount(0);

  // 非同行者不能基于该行程创建保险记录。
  const response = await page.request.post(`${API}/trips/${trip.id}/insurance/confirm`, {
    headers: { 'X-User-Id': String(visitor.id) },
  });
  expect(response.status()).toBe(403);
});

test('closed trip cannot open insurance or borrow even for its publisher', async ({ page }) => {
  const account = await createUserViaApi(page, nickname('closed'));
  const trip = await createTripViaApi(page, account.id, `已结束行程 ${Date.now()}`);
  const completed = await page.request.post(`${API}/trips/${trip.id}/complete`, {
    headers: { 'X-User-Id': String(account.id) },
  });
  expect(completed.ok()).toBeTruthy();

  await loginAsAccount(page, account);
  await page.goto(`/#/trips/${trip.id}/finance`);
  await expect(page.getByText('行程已结束或已取消，无法再购买保障或借款。')).toBeVisible();
  await expect(page.getByRole('button', { name: '前往第三方购买' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '申请借款' })).toHaveCount(0);
});