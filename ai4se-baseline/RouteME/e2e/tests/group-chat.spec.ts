import { expect, test, type Page } from '@playwright/test';
import {
  API,
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
  createUserViaApi,
  loginAsAccount,
  type ApiAccount,
} from './support';

/**
 * 路线编辑与满员群聊：
 * 1. 发布者改途经点 → 已接受同行者收到路线通知；
 * 2. 接受至满员 → 自动建群 → 双方各发一条 → 刷新后仍在 → 路线变更同步进群。
 * 全部用现场注册的账号与行程，不依赖种子行号。
 */

async function makePair(page: Page, stamp: string): Promise<[ApiAccount, ApiAccount]> {
  const publisher = await createUserViaApi(page, `E2E群主${stamp}`);
  const companion = await createUserViaApi(page, `E2E同行${stamp}`);
  return [publisher, companion];
}

async function notificationsFor(page: Page, userId: number) {
  const response = await page.request.get(`${API}/notifications`, {
    headers: { 'X-User-Id': String(userId) },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    items: { event: string; trip_id: number | null }[];
  };
}

test('publisher edits stops and the accepted companion gets a route notification', async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);
  const [publisher, companion] = await makePair(page, stamp);
  const title = `E2E 路线编辑 ${stamp}`;
  const trip = await createTripViaApi(page, publisher.id, title, { capacity: 3, daysFromToday: 2 });
  await applyViaApi(page, companion.id, trip.id, '想一起拍日落。');
  await acceptApplicationViaApi(page, publisher.id, trip.id, companion.id);

  await loginAsAccount(page, publisher);
  await page.goto(`/#/trips/${trip.id}`);
  await page.getByTestId('trip-route-edit').click();
  await expect(page.getByText('编辑途经点')).toBeVisible();

  const stops = page.getByTestId('route-stop-input');
  await stops.nth(1).fill('情侣路日落机位');
  await page.getByTestId('route-add-stop').click();
  await stops.nth(2).fill('野狸岛夜景');
  await page.getByRole('button', { name: '保存路线' }).click();
  await expect(page.getByText('路线已更新，已通知同行者')).toBeVisible();
  await expect(page.locator('.route-strip')).toContainText('野狸岛夜景');

  // 未满员不开群：详情页没有群入口，同行者只收到路线通知。
  await expect(page.getByTestId('trip-group-entry')).toHaveCount(0);
  const inbox = await notificationsFor(page, companion.id);
  expect(
    inbox.items.some((item) => item.event === 'trip_route_updated' && item.trip_id === trip.id),
  ).toBeTruthy();

  await loginAsAccount(page, companion);
  await page.goto('/#/notifications');
  await expect(page.getByText(/路线已更新/).first()).toBeVisible();
});

test('accepting to full opens the group chat and messages survive a reload', async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);
  const [publisher, companion] = await makePair(page, stamp);
  const title = `E2E 满员群聊 ${stamp}`;
  const trip = await createTripViaApi(page, publisher.id, title, { capacity: 2, daysFromToday: 2 });
  await applyViaApi(page, companion.id, trip.id, '人齐了就出发。');
  await acceptApplicationViaApi(page, publisher.id, trip.id, companion.id);

  // 满员瞬间建群：详情页出现群入口，点进去能看到欢迎消息。
  await loginAsAccount(page, publisher);
  await page.goto(`/#/trips/${trip.id}`);
  await page.getByTestId('trip-group-entry').click();
  await expect(page).toHaveURL(new RegExp(`#/chat/${trip.id}/group$`));
  await expect(page.locator('.chat-body')).toContainText('人齐了，群聊已开通');
  await expect(page.locator('.chat-head-trip')).toContainText('2 人');

  // 成员条常显：无需点击，发布者置顶带「群主」徽标，双方都在名单里。
  const memberPanel = page.getByTestId('chat-group-members');
  await expect(memberPanel).toBeVisible();
  await expect(memberPanel).toContainText('群成员');
  const memberRows = page.getByTestId('chat-group-member');
  await expect(memberRows).toHaveCount(2);
  await expect(memberRows.first()).toContainText(publisher.nickname);
  await expect(memberRows.first()).toContainText('群主');
  await expect(memberRows.nth(1)).toContainText(companion.nickname);
  // 点成员可打开资料弹窗。
  await memberRows.nth(1).click();
  await expect(page.locator('.profile-modal')).toBeVisible();
  await expect(page.locator('.profile-modal-name')).toContainText(companion.nickname);
  await page.keyboard.press('Escape');
  await expect(memberPanel).toBeVisible();

  await page.locator('.composer-input').fill('集合点改到香洲港公交站');
  await page.getByRole('button', { name: /发\s*送/ }).click();
  await expect(page.locator('.chat-body .bubble', { hasText: '集合点改到香洲港公交站' })).toBeVisible();

  // 同行者在会话列表看到群徽标，进群能读到发布者的消息并回复。
  await loginAsAccount(page, companion);
  await page.goto('/#/chat');
  const groupRow = page.locator('.chat-item', { hasText: title }).filter({
    has: page.locator('.chat-group-badge'),
  });
  await expect(groupRow).toBeVisible();
  await groupRow.click();
  await expect(page).toHaveURL(new RegExp(`#/chat/${trip.id}/group$`));
  await expect(page.locator('.chat-body .bubble', { hasText: '集合点改到香洲港公交站' })).toBeVisible();
  await expect(page.locator('.msg-sender', { hasText: publisher.nickname }).first()).toBeVisible();

  await page.locator('.composer-input').fill('收到，准时到');
  await page.getByRole('button', { name: /发\s*送/ }).click();
  await expect(page.locator('.chat-body .bubble', { hasText: '收到，准时到' })).toBeVisible();

  // 刷新后双方消息仍在。
  await page.reload();
  await expect(page.locator('.chat-body .bubble', { hasText: '集合点改到香洲港公交站' })).toBeVisible();
  await expect(page.locator('.chat-body .bubble', { hasText: '收到，准时到' })).toBeVisible();

  // 发布者再改路线：群里同步一条「路线已更新」消息。
  await loginAsAccount(page, publisher);
  await page.goto(`/#/trips/${trip.id}`);
  await page.getByTestId('trip-route-edit').click();
  await page.getByTestId('route-stop-input').nth(1).fill('海滨泳场日落');
  await page.getByRole('button', { name: '保存路线' }).click();
  await expect(page.getByText('路线已更新，已通知同行者')).toBeVisible();
  await page.goto(`/#/chat/${trip.id}/group`);
  await expect(page.locator('.chat-body .bubble', { hasText: '路线已更新：' })).toBeVisible();
});