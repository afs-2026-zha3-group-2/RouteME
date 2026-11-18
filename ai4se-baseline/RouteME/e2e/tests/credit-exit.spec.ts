import { expect, test } from '@playwright/test';
import {
  acceptedTrip,
  localDateTimeAfterHours,
  readCredit,
  registerViaApi,
  useAccount,
} from './creditSupport';
import { acceptApplicationViaApi, applyViaApi } from './support';

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

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
  // 未选原因前不展示预计影响，确认按钮置灰；下拉占位不是标签本身
  await expect(dialog.locator('[data-leave-preview]')).toHaveCount(0);
  await expect(dialog.locator('[data-leave-reason] option').first()).toHaveText('请选择退出原因');
  await expect(
    dialog.locator('[data-leave-reason] option', { hasText: '退出原因（必选）' }),
  ).toHaveCount(0);
  const okButton = dialog.getByRole('button', { name: '退出同行' });
  await expect(okButton).toBeDisabled();

  await dialog.locator('[data-leave-reason]').selectOption('personal');
  await expect(okButton).toBeEnabled();
  await expect(dialog.locator('[data-leave-preview]')).toContainText('本次 -5，退出后 75 / 100');

  // 二次确认：点确认前不产生退出与扣分
  expect((await readCredit(page, companion.userId)).credit_score).toBe(80);
  await okButton.click();

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
  const okButton = dialog.getByRole('button', { name: '退出同行' });
  await dialog.locator('[data-leave-reason]').selectOption('force_majeure');
  await expect(dialog.locator('[data-leave-preview]')).toContainText('暂不扣分，待核实');
  // 待核实只保留一行说明；说明必填，未填时不能提交
  await expect(dialog).not.toContainText('退出后进入待核实');
  await expect(okButton).toBeDisabled();
  await dialog.locator('[data-leave-note]').fill('台风停航，无法出发');
  await expect(okButton).toBeEnabled();

  // 证明材料可选：点击可见按钮唤起系统选择器，上传一张后确认
  const chooserPromise = page.waitForEvent('filechooser');
  await dialog.locator('.leave-evidence-add').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'proof.png',
    mimeType: 'image/png',
    buffer: PNG_BYTES,
  });
  await expect(dialog.locator('.leave-evidence-item')).toHaveCount(1);
  await okButton.click();

  await expect(page.getByText('已退出同行，信用分 80 → 80').first()).toBeVisible();
  const after = await readCredit(page, companion.userId);
  expect(after.credit_score).toBe(80);
  expect(after.credit_restricted).toBe(false);

  // 本人可在「我的旅行 → 我申请的」查看同行记录（申请 + 退出，含原因 / 说明 / 待核实 / 图片）
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '我申请的' }).click();
  const appliedRow = page.locator('.mine-row', { hasText: title });
  await appliedRow.getByRole('button', { name: '查看记录' }).click();
  const recordDialog = page.getByRole('dialog', { name: '同行记录' });
  await expect(recordDialog.locator('[data-leave-record]')).toContainText('不可抗力');
  await expect(recordDialog.locator('[data-leave-record]')).toContainText('台风停航，无法出发');
  await expect(recordDialog.locator('[data-leave-record]')).toContainText('待核实，暂不扣分');
  await expect(recordDialog.locator('.leave-record-images img')).toHaveCount(1);
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

test('rejoins and exits the same trip twice, doubling the second exit', async ({ page }) => {
  const publisher = await registerViaApi(page, '发起人');
  const companion = await registerViaApi(page, '同行');
  const title = `两次退出 ${Date.now()}`;
  const trip = await acceptedTrip(page, publisher, companion, title, {
    daysFromToday: 2,
    meeting: { area: '香洲港客运站', time: localDateTimeAfterHours(48) },
  });

  await useAccount(page, companion);
  await page.goto(`/#/trips/${trip.id}`);
  await page.getByRole('button', { name: '退出同行' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('[data-leave-reason]').selectOption('personal');
  await dialog.locator('[data-leave-note]').fill('第一次退出');
  await dialog.getByRole('button', { name: '退出同行' }).click();
  await expect(page.getByText('已退出同行，信用分 80 → 75').first()).toBeVisible();

  // 重新申请并被接受后，再次退出应生效，并按当月第 2 次翻倍
  await applyViaApi(page, companion.userId, trip.id, '再次申请');
  await acceptApplicationViaApi(page, publisher.userId, trip.id, companion.userId);
  await page.reload();
  await page.getByRole('button', { name: '退出同行' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[data-leave-reason]').selectOption('personal');
  await dialog.locator('[data-leave-note]').fill('第二次退出');
  await expect(dialog.locator('[data-leave-preview]')).toContainText('-10');
  await dialog.getByRole('button', { name: '退出同行' }).click();
  await expect(page.getByText('已退出同行，信用分 75 → 65').first()).toBeVisible();

  // 同一行程的两次退出都保留在记录里
  await page.goto('/#/mine');
  await page.locator('.ant-segmented-item', { hasText: '我申请的' }).click();
  await page.locator('.mine-row', { hasText: title }).getByRole('button', { name: '查看记录' }).first().click();
  const recordDialog = page.getByRole('dialog', { name: '同行记录' });
  await expect(recordDialog.locator('[data-leave-record-item]')).toHaveCount(2);
  await expect(recordDialog).toContainText('第二次退出');
  await expect(recordDialog).toContainText('第一次退出');
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
