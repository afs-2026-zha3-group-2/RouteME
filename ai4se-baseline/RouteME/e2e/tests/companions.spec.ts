import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

async function switchUser(page: Page, userId: number) {
  await loginAs(page, userId);
  await page.reload();
}

async function createTripViaApi(page: Page, publisherId: number, title: string) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisherId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination: '珠海',
      start_date: '2026-12-12',
      end_date: '2026-12-12',
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

test('shows match reasons and keeps match as the default sort', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('今天想走哪条路');
  await expect(page.locator('.view-seg')).toContainText('旅行计划');

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

test('applies, gets accepted, chats, reports and leaves', async ({ page }) => {
  const title = `E2E 同行流程 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);

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
  await page.goto(`/#/chat/${created.id}/2`);
  await expect(page.getByText('只有已匹配的同行者可以沟通。')).toHaveCount(0);
  await page.getByPlaceholder('输入消息（500 字以内）').fill('周六九点见。');
  await page.getByRole('button', { name: /发\s*送/ }).click();
  await expect(page.getByText('周六九点见。')).toBeVisible();
  await page.getByRole('button', { name: '刷新消息' }).click();
  await expect(page.getByText('周六九点见。')).toBeVisible();

  await page.getByRole('button', { name: /举\s*报/ }).click();
  await page.getByRole('button', { name: '提交举报' }).click();
  await expect(page.getByText('举报已收到，我们会记录处理。')).toBeVisible();
  await page.locator('.ant-modal-footer .ant-btn-primary').click();

  await page.goto(`/#/trips/${created.id}`);
  await page.getByRole('button', { name: '退出同行' }).click();
  await page.locator('.ant-popconfirm .ant-btn-primary').click();
  await expect(page.getByText('已加入 1/3人')).toBeVisible();
  await expect(page.getByRole('button', { name: '申请同行' })).toBeVisible();

  await page.goto('/#/mine');
  await expect(page.getByRole('heading', { name: '我的旅行' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /我申请的/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /已匹配/ })).toBeVisible();
});

test('keeps companion entry points honest', async ({ page }) => {
  const title = `E2E 自己的行程 ${Date.now()}`;
  const created = await createTripViaApi(page, 1, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByRole('button', { name: '申请同行' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /查看同行的申请/ })).toBeVisible();

  await page.goto('/#/chat/3/2');
  await expect(page.getByText('只有已匹配的同行者可以沟通。')).toBeVisible();

  await page.goto('/#/chat/1/2');
  await expect(page.getByText('行程已结束，聊天只能查看历史消息。')).toBeVisible();
  await expect(page.getByRole('button', { name: /发\s*送/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /全部接受|标记已读|开启推送/ })).toHaveCount(0);
});