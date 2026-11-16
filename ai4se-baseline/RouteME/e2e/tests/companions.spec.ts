import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const CHAT_PLACEHOLDER = '输入消息，Enter 发送，Shift + Enter 换行';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

async function switchUser(page: Page, userId: number) {
  await loginAs(page, userId);
  await page.reload();
}

async function createTripViaApi(
  page: Page,
  publisherId: number,
  title: string,
  meeting?: { area?: string; time?: string },
) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisherId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: '2026-12-12',
      end_date: '2026-12-12',
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
      meeting_area: meeting?.area ?? null,
      meeting_time: meeting?.time ?? null,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

async function acceptViaApi(page: Page, tripId: number, publisherId: number, applicantId: number) {
  const applyResponse = await page.request.post(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(applicantId), 'Content-Type': 'application/json' },
    data: {},
  });
  expect(applyResponse.ok()).toBeTruthy();

  const listResponse = await page.request.get(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  const applications = (await listResponse.json()) as Array<{ id: number; status: string }>;
  const pending = applications.find((application) => application.status === 'pending');
  expect(pending).toBeTruthy();

  const acceptResponse = await page.request.post(`${API}/applications/${pending?.id}/accept`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(acceptResponse.ok()).toBeTruthy();
}

test('shows match reasons and keeps match as the default sort', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('今天想走哪条路');
  await expect(page.locator('.view-seg')).toContainText('招募中的行程');

  const firstCard = page.locator('.trip-card').first();
  await expect(firstCard.locator('.match-score')).toHaveText(/匹配度 \d+%/);
  await expect(firstCard.locator('.match-reason-label')).toHaveText('匹配理由');
  await expect(firstCard.locator('.match-reason')).not.toBeEmpty();

  const percentages = await page
    .locator('.trip-card .match-percentage')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.textContent ?? '0')));
  expect(percentages.length).toBeGreaterThan(1);
  expect(percentages).toEqual([...percentages].sort((left, right) => right - left));

  const reasonsForUser1 = await page.locator('.trip-card .match-reason').allTextContents();
  await switchUser(page, 2);
  await expect(page.locator('.trip-card').first()).toBeVisible();
  const reasonsForUser2 = await page.locator('.trip-card .match-reason').allTextContents();
  expect(reasonsForUser2).not.toEqual(reasonsForUser1);

  await firstCard.click();
  await expect(page.locator('.match-reason-list li').first()).toBeVisible();
  await expect(page.locator('.detail-meta').filter({ hasText: '匹配度' })).toBeVisible();
});

test('lists conversations, keeps history readable and still chats after leaving', async ({ page }) => {
  const title = `E2E 聊天流程 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title, {
    area: '香洲港客运站',
    time: '2026-12-12T08:30',
  });

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await page.getByRole('button', { name: '申请同行' }).click();
  await page.getByPlaceholder('说说你为什么想一起走，方便发布者判断。').fill('想一起拍日落。');
  await page.getByRole('button', { name: '提交申请' }).click();
  await expect(page.getByText('申请待处理')).toBeVisible();

  await switchUser(page, 2);
  await page.goto(`/#/trips/${created.id}/applications`);
  await expect(page.getByRole('heading', { name: '同行申请' })).toBeVisible();
  await expect(page.getByText('想一起拍日落。')).toBeVisible();
  await page.getByRole('button', { name: /接\s*受/ }).click();
  await expect(page.getByText('已匹配同行')).toBeVisible();

  await switchUser(page, 1);

  // 我的旅行·已匹配展示集合区域、集合时间与同行人数
  await page.goto('/#/mine');
  await page.getByRole('tab', { name: /已匹配/ }).click();
  await expect(page.locator('.mine-row', { hasText: title })).toContainText('集合：香洲港客运站');
  await expect(page.locator('.mine-row', { hasText: title })).toContainText('12/12 08:30');
  await expect(page.locator('.mine-row', { hasText: title })).toContainText('同行 2 人');

  await page.goto(`/#/chat/${created.id}/2`);

  // 左栏含「已匹配但尚无消息」的会话
  await expect(page.locator('.chat-item').first()).toBeVisible();
  const conversation = page.locator('.chat-item', { hasText: title });
  await expect(conversation).toBeVisible();
  await expect(conversation.locator('.ci-last')).toHaveText('还没有消息，先确认集合时间吧');

  // 聊天安全条带集合区域与时间
  await expect(page.locator('.chat-safety')).toContainText('集合区域：香洲港客运站');
  await expect(page.locator('.chat-safety')).toContainText('集合时间：12/12 08:30');

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
  await page.getByRole('button', { name: /举\s*报/ }).click();
  await page.getByRole('button', { name: '提交举报' }).click();
  await expect(page.getByText('举报已收到，我们会记录处理。')).toBeVisible();
  await page.locator('.ant-modal-footer .ant-btn-primary').click();

  // 退出同行：聊天保留且仍可继续
  await page.goto(`/#/trips/${created.id}`);
  await page.getByRole('button', { name: '退出同行' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '退出同行' }).click();
  await expect(page.getByText('已加入 1/3人')).toBeVisible();
  await expect(page.getByRole('button', { name: '申请同行' })).toBeVisible();

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

test('keeps companion entry points honest', async ({ page }) => {
  const title = `E2E 自己的行程 ${Date.now()}`;
  const created = await createTripViaApi(page, 1, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByRole('button', { name: '申请同行' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /查看同行的申请/ })).toBeVisible();

  // 仅 PENDING 的用户被拒，且给出说明
  await page.goto('/#/chat/3/2');
  await expect(page.getByText('只有已匹配的同行者可以沟通。')).toBeVisible();
  await expect(page.getByText(/仅待处理的申请还不能聊天/)).toBeVisible();

  // 已结束行程只读，且没有退出同行与富媒体入口
  await page.goto('/#/chat/1/2');
  await expect(page.locator('.composer-closed')).toContainText('行程已结束');
  await expect(page.locator('.composer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '退出同行' })).toHaveCount(0);
  await expect(page.locator('[type="file"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /全部接受|标记已读|开启推送/ })).toHaveCount(0);
});

test('polls new messages without manual refresh', async ({ browser }) => {
  const title = `E2E 轮询 ${Date.now()}`;
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const created = await createTripViaApi(pageA, 2, title);
  await acceptViaApi(pageA, created.id, 2, 1);

  await loginAs(pageA, 1);
  await pageA.goto(`/#/chat/${created.id}/2`);
  await expect(pageA.locator('.chat-item').first()).toBeVisible();

  await loginAs(pageB, 2);
  await pageB.goto(`/#/chat/${created.id}/1`);
  await expect(pageB.locator('.chat-item').first()).toBeVisible();

  await pageB.getByPlaceholder(CHAT_PLACEHOLDER).fill('三秒内应该能看到。');
  await pageB.getByRole('button', { name: /发\s*送/ }).click();

  await expect(pageA.locator('.chat-body').getByText('三秒内应该能看到。')).toBeVisible({ timeout: 6000 });

  await contextA.close();
  await contextB.close();
});

test('sends on Enter and keeps a newline on Shift+Enter', async ({ page }) => {
  const title = `E2E 键盘 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);
  await acceptViaApi(page, created.id, 2, 1);

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
