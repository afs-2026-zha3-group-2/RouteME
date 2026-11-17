import { expect, test } from '@playwright/test';
import { acceptApplicationViaApi, applyViaApi, createTripViaApi } from './support';
import {
  acceptedTrip,
  leaveViaApi,
  readCredit,
  registerViaApi,
  useAccount,
} from './creditSupport';

/**
 * E3：信用分跌破 60 后，系统取消发布者的未结束行程，
 * 原因只对发布者与已匹配同行者可见，聊天变为只读。
 */
test('cancels the publisher trips with the system reason and keeps the reason private', async ({
  page,
}) => {
  const publisher = await registerViaApi(page, '发布者');
  const host = await registerViaApi(page, '发起人');
  const companion = await registerViaApi(page, '同行');

  // 发布者名下的未结束行程，已接受一位同行者
  const title = `系统取消 ${Date.now()}`;
  const trip = await createTripViaApi(page, publisher.userId, title, { daysFromToday: 5 });
  await applyViaApi(page, companion.userId, trip.id, '想一起走。');
  await acceptApplicationViaApi(page, publisher.userId, trip.id, companion.userId);

  // 两次旅行中退出：80 → 65 → 50，第二次跌破 60 触发限制
  const first = await acceptedTrip(page, host, publisher, `被清退一 ${Date.now()}`);
  await leaveViaApi(page, publisher.userId, first.id, 'personal');
  const second = await acceptedTrip(page, host, publisher, `被清退二 ${Date.now()}`);
  await leaveViaApi(page, publisher.userId, second.id, 'personal');

  const credit = await readCredit(page, publisher.userId);
  expect(credit.credit_score).toBe(50);
  expect(credit.credit_restricted).toBe(true);

  // 发布者：看得到系统取消原因
  await useAccount(page, publisher);
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByText('这条行程已取消')).toBeVisible();
  await expect(page.getByText('取消原因：信用分低于 60，账号受限')).toBeVisible();
  await expect(page.getByRole('button', { name: '取消行程' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '结束行程' })).toHaveCount(0);

  // 其他用户：只看到已取消，不显示原因
  await useAccount(page, host);
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByText('这条行程已取消')).toBeVisible();
  await expect(page.getByText(/^取消原因：/)).toHaveCount(0);

  // 被清退的同行者：仍可见原因，但聊天只能读
  await useAccount(page, companion);
  await page.goto(`/#/trips/${trip.id}`);
  await expect(page.getByText('取消原因：信用分低于 60，账号受限')).toBeVisible();
  await page.goto(`/#/chat/${trip.id}/${publisher.userId}`);
  await expect(page.locator('.composer-closed')).toContainText(
    '该行程已取消，只能查看历史消息。',
  );
  await expect(page.locator('.composer')).toHaveCount(0);
});

