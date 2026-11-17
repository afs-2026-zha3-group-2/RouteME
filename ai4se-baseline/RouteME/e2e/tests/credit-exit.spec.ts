import { expect, test } from '@playwright/test';
import {
  acceptedTrip,
  localDateTimeAfterHours,
  readCredit,
  registerViaApi,
  useAccount,
} from './creditSupport';

/**
 * E1：三入口退出弹窗 + 预计影响 + 实际扣分。
 * 账号现注册（80 分起），断言真实链路，不依赖共享库的历史余额。
 */
test('leaves from the detail page after the 48h preview and deducts 5', async ({ page }) => {
  const publisher = await registerViaApi(page, '发起人');
  const companion = await registerViaApi(page, '同行');
  const trip = await acceptedTrip(page, publisher, companion, `退出详情 ${Date.now()}`, {
    daysFromToday: 2,
    meeting: { area: '香洲港客运站', time: localDateTimeAfterHours(48) },
  });

  await useAccount(page, companion);
  await page.goto(`/#/trips/${trip.id}`);
  await page.getByRole('button', { name: '退出同行' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // 未选原因前不展示预计影响
  await expect(dialog.locator('[data-leave-preview]')).toHaveCount(0);

  await dialog.locator('[data-leave-reason]').selectOption('personal');
  await expect(dialog.locator('[data-leave-preview]')).toContainText('本次 -5，退出后 75 / 100');

  // 二次确认：点确认前不产生退出与扣分
  expect((await readCredit(page, companion.userId)).credit_score).toBe(80);
  await dialog.getByRole('button', { name: '退出同行' }).click();

  await expect(page.locator('.ant-alert').filter({ hasText: '已退出同行，信用分 80 → 75' })).toBeVisible();
  await expect(page.getByText('已加入 1/3人')).toBeVisible();
  const after = await readCredit(page, companion.userId);
  expect(after.credit_score).toBe(75);
  expect(after.credit_restricted).toBe(false);
});

test('leaves from my trips with force majeure and stays unpenalized pending review', async ({ page }) => {
  const publisher = await registerViaApi(page, '发起人');
  const companion = await registerViaApi(page, '同行');
  const title = `退出我的旅行 ${Date.now()}`;
  await acceptedTrip(page, publisher, companion, title, {
    daysFromToday: 2,
    meeting: { area: '香洲港客运站', time: localDateTimeAfterHours(48) },
  });

  await useAccount(page, companion);
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '已匹配同行' }).click();

  const row = page.locator('.mine-row', { hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '退出同行' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('[data-leave-reason]').selectOption('force_majeure');
  await expect(dialog.locator('[data-leave-preview]')).toContainText('暂不扣分，待核实');
  await dialog.getByRole('button', { name: '退出同行' }).click();

  await expect(page.getByText('已退出同行，信用分 80 → 80').first()).toBeVisible();
  const after = await readCredit(page, companion.userId);
  expect(after.credit_score).toBe(80);
  expect(after.credit_restricted).toBe(false);
});

test('leaves from chat and deducts the fixed 15 during the trip', async ({ page }) => {
  const publisher = await registerViaApi(page, '发起人');
  const companion = await registerViaApi(page, '同行');
  const trip = await acceptedTrip(page, publisher, companion, `退出聊天 ${Date.now()}`);

  await useAccount(page, companion);
  await page.goto(`/#/chat/${trip.id}/${publisher.userId}`);
  await expect(page.locator('.chat-item').first()).toBeVisible();

  await page.getByRole('button', { name: '退出同行' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('[data-leave-reason]').selectOption('personal');
  await expect(dialog.locator('[data-leave-preview]')).toContainText('旅行中退出 -15');
  await dialog.getByRole('button', { name: '退出同行' }).click();

  await expect(page.getByText('已退出同行，信用分 80 → 65').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '退出同行' })).toHaveCount(0);
  expect((await readCredit(page, companion.userId)).credit_score).toBe(65);
});

test('doubles the second pre-departure exit in the same month', async ({ page }) => {
  const publisher = await registerViaApi(page, '发起人');
  const companion = await registerViaApi(page, '同行');
  const first = await acceptedTrip(page, publisher, companion, `第一次退出 ${Date.now()}`, {
    daysFromToday: 2,
    meeting: { area: '香洲港客运站', time: localDateTimeAfterHours(48) },
  });
  const second = await acceptedTrip(page, publisher, companion, `第二次退出 ${Date.now()}`, {
    daysFromToday: 2,
    meeting: { area: '香洲港客运站', time: localDateTimeAfterHours(48) },
  });

  await useAccount(page, companion);

  await page.goto(`/#/trips/${first.id}`);
  await page.getByRole('button', { name: '退出同行' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('[data-leave-reason]').selectOption('personal');
  await expect(dialog.locator('[data-leave-preview]')).toContainText('本次 -5，退出后 75 / 100');
  await dialog.getByRole('button', { name: '退出同行' }).click();
  await expect(page.locator('.ant-alert').filter({ hasText: '已退出同行，信用分 80 → 75' })).toBeVisible();

  await page.goto(`/#/trips/${second.id}`);
  await page.getByRole('button', { name: '退出同行' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[data-leave-reason]').selectOption('personal');
  await expect(dialog.locator('[data-leave-preview]')).toContainText(
    '本次 -10（本月第 2 次，翻倍），退出后 65 / 100',
  );
  await dialog.getByRole('button', { name: '退出同行' }).click();
  await expect(page.locator('.ant-alert').filter({ hasText: '已退出同行，信用分 75 → 65' })).toBeVisible();

  const after = await readCredit(page, companion.userId);
  expect(after.credit_score).toBe(65);
});
