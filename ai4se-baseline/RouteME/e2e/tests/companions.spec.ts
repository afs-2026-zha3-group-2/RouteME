import { expect, test, type Page } from '@playwright/test';
import {
  API,
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
  loginAs,
  switchUser,
  todayIso,
} from './support';

const CHAT_PLACEHOLDER = '输入消息，Enter 发送，Shift + Enter 换行';
const APPLY_PLACEHOLDER = '例如：这条线我走过一半，想补上日落那段，可以帮忙背装备。';
const PENDING_NOTE = '申请已提交，等待 陈屿 回应。处理前你可以随时撤回。';

async function completeTripViaApi(page: Page, publisherId: number, tripId: number) {
  const response = await page.request.post(`${API}/trips/${tripId}/complete`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(response.ok()).toBeTruthy();
}

async function loadMyApplicationsViaApi(page: Page, userId: number) {
  const response = await page.request.get(`${API}/me/applications`, {
    headers: { 'X-User-Id': String(userId) },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { trip_id: number; message: string | null; status: string }[];
}

test('shows match reasons and keeps match as the default sort', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('今天想走哪条路');
  await expect(page.locator('.view-seg')).toContainText('招募中的行程');

  const firstCard = page.locator('.trip-card').first();
  await expect(firstCard.locator('.match-ring .ant-progress-indicator')).toHaveText(/^\d+$/);
  await expect(firstCard.locator('.match-reason')).not.toBeEmpty();

  const scores = await page
    .locator('.trip-card .match-ring .ant-progress-indicator')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.textContent ?? '0')));
  expect(scores.length).toBeGreaterThan(1);
  expect(scores).toEqual([...scores].sort((left, right) => right - left));

  const reasonsForUser1 = await page.locator('.trip-card .match-reason').allTextContents();
  await switchUser(page, 2);
  await expect(page.locator('.trip-card').first()).toBeVisible();
  const reasonsForUser2 = await page.locator('.trip-card .match-reason').allTextContents();
  expect(reasonsForUser2).not.toEqual(reasonsForUser1);

  await firstCard.click();
  await expect(page.locator('.match-summary .match-reason')).toBeVisible();
  await expect(page.locator('.match-summary .ant-progress')).toBeVisible();
  await expect(page.locator('.match-rule')).toContainText('目的地相同 50 分');
});

test('lists conversations, keeps history readable and still chats after leaving', async ({ page }) => {
  const title = `E2E 聊天流程 ${Date.now()}`;
  const today = todayIso();
  const meetingLabel = '今天 08:30';
  const created = await createTripViaApi(page, 2, title, {
    capacity: 3,
    meeting: { area: '香洲港客运站', time: `${today}T08:30` },
  });

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await page.getByPlaceholder(APPLY_PLACEHOLDER).fill('想一起拍日落。');
  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.getByText(PENDING_NOTE)).toBeVisible();

  await switchUser(page, 2);
  await page.goto(`/#/trips/${created.id}/applications`);
  await expect(page.getByRole('heading', { name: '同行申请' })).toBeVisible();
  await expect(page.getByText('想一起拍日落。')).toBeVisible();
  await page.getByRole('button', { name: /接\s*受/ }).click();
  await expect(page.getByText('已匹配同行')).toBeVisible();
  await expect(page.getByRole('button', { name: '进入聊天' })).toBeVisible();

  await switchUser(page, 1);

  // 我的旅行·已匹配展示集合区域、集合时间与同行人数
  await page.goto('/#/mine');
  await page.getByRole('tab', { name: /已匹配/ }).click();
  await expect(page.locator('.mine-row', { hasText: title })).toContainText('集合：香洲港客运站');
  await expect(page.locator('.mine-row', { hasText: title })).toContainText(meetingLabel);
  await expect(page.locator('.mine-row', { hasText: title })).toContainText('同行 2 人');

  await page.goto(`/#/chat/${created.id}/2`);

  // 左栏含「已匹配但尚无消息」的会话
  await expect(page.locator('.chat-item').first()).toBeVisible();
  const conversation = page.locator('.chat-item', { hasText: title });
  await expect(conversation).toBeVisible();
  await expect(conversation.locator('.ci-last')).toHaveText('还没有消息，先确认集合时间吧');

  // 聊天安全条带集合区域与时间
  await expect(page.locator('.chat-safety')).toContainText('集合区域：香洲港客运站');
  await expect(page.locator('.chat-safety')).toContainText(`集合时间：${meetingLabel}`);

  // 发送两条并刷新，历史仍在、升序、带时间
  await page.getByPlaceholder(CHAT_PLACEHOLDER).fill('周六九点见。');
  await page.getByRole('button', { name: /发\s*送/ }).click();
  await expect(page.locator('.chat-body').getByText('周六九点见。')).toBeVisible();
  await page.getByPlaceholder(CHAT_PLACEHOLDER).fill('带三脚架。');
  await page.getByRole('button', { name: /发\s*送/ }).click();
  await expect(page.locator('.chat-body').getByText('带三脚架。')).toBeVisible();

  const bubbles = page.locator('.chat-body .msg .bubble');
  await expect(bubbles).toHaveCount(2);
  await expect(bubbles.nth(0)).toHaveText('周六九点见。');
  await expect(bubbles.nth(1)).toHaveText('带三脚架。');
  await expect(page.locator('.chat-body .msg-time')).toHaveCount(2);

  await page.reload();
  await expect(page.locator('.chat-body .msg .bubble')).toHaveCount(2);
  await expect(page.locator('.chat-body .msg .bubble').nth(0)).toHaveText('周六九点见。');

  // 手动刷新
  await page.getByRole('button', { name: '刷新消息' }).click();
  await expect(page.locator('.chat-body').getByText('周六九点见。')).toBeVisible();

  // 举报
  await page.getByRole('button', { name: '举报这位用户' }).click();
  await page.getByRole('button', { name: '提交举报' }).click();
  await expect(page.getByText('已收到，我们会处理')).toBeVisible();
  await page
    .getByRole('dialog')
    .locator('.ant-modal-footer')
    .getByRole('button', { name: /^关\s*闭$/ })
    .click();

  // 退出同行：聊天保留且仍可继续
  await page.goto(`/#/trips/${created.id}`);
  await page.getByRole('button', { name: '退出同行' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '退出同行' }).click();
  await expect(page.getByText('已加入 1/3人')).toBeVisible();
  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeVisible();

  await page.goto(`/#/chat/${created.id}/2`);
  await expect(page.locator('.chat-item', { hasText: title })).toBeVisible();
  await expect(page.getByRole('button', { name: '退出同行' })).toHaveCount(0);
  await page.getByPlaceholder(CHAT_PLACEHOLDER).fill('退出后还能继续聊。');
  await page.getByRole('button', { name: /发\s*送/ }).click();
  await expect(page.locator('.chat-body').getByText('退出后还能继续聊。')).toBeVisible();

  // 我的旅行：已匹配不再列出，「我申请的」显示已退出
  await page.goto('/#/mine');
  await page.getByRole('tab', { name: /已匹配/ }).click();
  await expect(page.getByText(title)).toHaveCount(0);
  await page.getByRole('tab', { name: /我申请的/ }).click();
  await expect(page.locator('.mine-row', { hasText: title })).toContainText('已退出');
});

test('applies inline and keeps the pending state after reload', async ({ page }) => {
  const title = `E2E 内联申请 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByRole('dialog')).toHaveCount(0);
  const textarea = page.getByPlaceholder(APPLY_PLACEHOLDER);
  await expect(textarea).toBeVisible();
  await textarea.fill('字'.repeat(130));
  await expect(textarea).toHaveValue('字'.repeat(120));
  await textarea.fill('想一起拍日落。');
  await page.getByRole('button', { name: '提交同行申请' }).click();

  await expect(page.getByText(PENDING_NOTE)).toBeVisible();
  await expect(page.getByRole('button', { name: '撤回申请' })).toBeVisible();
  await expect(textarea).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(PENDING_NOTE)).toBeVisible();
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toHaveCount(0);

  await completeTripViaApi(page, 2, created.id);
});

test('blocks a duplicate application submitted from a stale page', async ({ page }) => {
  const title = `E2E 重复申请 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title, { capacity: 2 });

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeVisible();

  await applyViaApi(page, 1, created.id, '第一次申请');
  await applyViaApi(page, 3, created.id, '第三人申请');
  await acceptApplicationViaApi(page, 2, created.id, 3);

  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.getByText('已申请，请等待回应')).toBeVisible();
  await expect(page.getByText(PENDING_NOTE)).toBeVisible();
  await expect(page.getByRole('button', { name: '提交同行申请' })).toHaveCount(0);

  const mine = await loadMyApplicationsViaApi(page, 1);
  expect(mine.filter((application) => application.trip_id === created.id)).toHaveLength(1);
});

test('rejects a submission after the trip fills and shows the reason', async ({ page }) => {
  const title = `E2E 满员拒绝 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title, { capacity: 2 });

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeVisible();

  await applyViaApi(page, 3, created.id, '第三人申请');
  await acceptApplicationViaApi(page, 2, created.id, 3);

  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.locator('.ant-alert').filter({ hasText: '人数已满' })).toBeVisible();
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '提交同行申请' })).toHaveCount(0);
  await expect(page.locator('.detail-application .action-note')).toHaveText('人数已满');
});

test('rejects a submission after the trip ends', async ({ page }) => {
  const title = `E2E 结束拒绝 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeVisible();

  await completeTripViaApi(page, 2, created.id);

  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.locator('.ant-alert').filter({ hasText: '行程已结束' })).toBeVisible();
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toHaveCount(0);
  await expect(page.locator('.detail-application .action-note')).toHaveText('行程已结束');
});

test('withdraws a pending application and restores the inline form', async ({ page }) => {
  const title = `E2E 撤回申请 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.getByText(PENDING_NOTE)).toBeVisible();

  const mine = await loadMyApplicationsViaApi(page, 1);
  const application = mine.find((item) => item.trip_id === created.id);
  expect(application?.message).toBeNull();

  await page.getByRole('button', { name: '撤回申请' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '撤回申请' }).click();
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toBeVisible();

  const afterCancel = await loadMyApplicationsViaApi(page, 1);
  expect(afterCancel.find((item) => item.trip_id === created.id)?.status).toBe('cancelled');

  await page.reload();
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toBeVisible();

  await completeTripViaApi(page, 2, created.id);
});

test('keeps companion entry points honest', async ({ page }) => {
  const title = `E2E 自己的行程 ${Date.now()}`;
  const created = await createTripViaApi(page, 1, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByRole('button', { name: '提交同行申请' })).toHaveCount(0);
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /查看同行的申请/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '结束行程' })).toBeVisible();

  // 仅 PENDING 的用户被拒，且给出说明
  await page.goto('/#/chat/3/2');
  await expect(page.getByText('只有已匹配的同行者可以沟通。')).toBeVisible();
  await expect(page.getByText(/仅待处理的申请还不能聊天/)).toBeVisible();

  // 已结束行程只读，且没有退出同行与富媒体入口
  await page.goto('/#/chat/1/2');
  await expect(page.locator('.composer-closed')).toContainText('该行程已结束');
  await expect(page.locator('.composer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '退出同行' })).toHaveCount(0);
  await expect(page.locator('[type="file"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /全部接受|标记已读|开启推送/ })).toHaveCount(0);

  await completeTripViaApi(page, 1, created.id);
});

test('polls new messages without manual refresh', async ({ browser }) => {
  const title = `E2E 轮询 ${Date.now()}`;
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const created = await createTripViaApi(pageA, 2, title);
  await applyViaApi(pageA, 1, created.id);
  await acceptApplicationViaApi(pageA, 2, created.id, 1);

  await loginAs(pageA, 1);
  await pageA.goto(`/#/chat/${created.id}/2`);
  await expect(pageA.locator('.chat-item').first()).toBeVisible();

  await loginAs(pageB, 2);
  await pageB.goto(`/#/chat/${created.id}/1`);
  await expect(pageB.locator('.chat-item').first()).toBeVisible();

  await pageB.getByPlaceholder(CHAT_PLACEHOLDER).fill('三秒内应该能看到。');
  await pageB.getByRole('button', { name: /发\s*送/ }).click();

  await expect(pageA.locator('.chat-body').getByText('三秒内应该能看到。')).toBeVisible({
    timeout: 6000,
  });

  await contextA.close();
  await contextB.close();
});

test('sends on Enter and keeps a newline on Shift+Enter', async ({ page }) => {
  const title = `E2E 键盘 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);
  await applyViaApi(page, 1, created.id);
  await acceptApplicationViaApi(page, 2, created.id, 1);

  await loginAs(page, 1);
  await page.goto(`/#/chat/${created.id}/2`);

  const input = page.getByPlaceholder(CHAT_PLACEHOLDER);
  await expect(input).toBeVisible();
  const sendButton = page.getByRole('button', { name: /发\s*送/ });
  await expect(sendButton).toBeDisabled();

  await input.fill('第一行');
  await expect(sendButton).toBeEnabled();
  await input.press('Shift+Enter');
  await input.type('第二行');
  await expect(input).toHaveValue('第一行\n第二行');

  await input.press('Enter');
  await expect(page.locator('.chat-body .msg .bubble').last()).toContainText('第一行');
  await expect(input).toHaveValue('');
});
