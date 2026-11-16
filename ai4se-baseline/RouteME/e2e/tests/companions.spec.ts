import { expect, test, type Page } from '@playwright/test';

const API = '/api';
const APPLY_PLACEHOLDER = '例如：这条线我走过一半，想补上日落那段，可以帮忙背装备。';
const PENDING_NOTE = '申请已提交，等待 陈屿 回应。处理前你可以随时撤回。';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

async function switchUser(page: Page, userId: number) {
  await loginAs(page, userId);
  await page.reload();
}

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function createTripViaApi(page: Page, publisherId: number, title: string, capacity = 3) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisherId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: todayIso(),
      end_date: todayIso(),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

async function applyViaApi(page: Page, userId: number, tripId: number, message: string | null = null) {
  const response = await page.request.post(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(userId), 'Content-Type': 'application/json' },
    data: { message },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

async function acceptApplicationViaApi(page: Page, publisherId: number, tripId: number, applicantId: number) {
  const listResponse = await page.request.get(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(listResponse.ok()).toBeTruthy();
  const applications = (await listResponse.json()) as { id: number; applicant: { id: number } }[];
  const target = applications.find((application) => application.applicant.id === applicantId);
  expect(target).toBeTruthy();
  const response = await page.request.post(`${API}/applications/${target!.id}/accept`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(response.ok()).toBeTruthy();
}

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

test('applies, gets accepted, chats, reports and leaves', async ({ page }) => {
  const title = `E2E 同行流程 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);

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
  await page.getByRole('dialog').getByRole('button', { name: '退出同行' }).click();
  await expect(page.getByText('已加入 1/3人')).toBeVisible();
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toBeVisible();

  await page.goto('/#/mine');
  await expect(page.getByRole('heading', { name: '我的旅行' })).toBeVisible();
  await expect(page.locator('.ant-segmented-item', { hasText: '我申请的' })).toBeVisible();
  await expect(page.locator('.ant-segmented-item', { hasText: '已匹配同行' })).toBeVisible();

  await completeTripViaApi(page, 2, created.id);
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
  const created = await createTripViaApi(page, 2, title, 2);

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
  const created = await createTripViaApi(page, 2, title, 2);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeVisible();

  await applyViaApi(page, 3, created.id, '第三人申请');
  await acceptApplicationViaApi(page, 2, created.id, 3);

  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.locator('.ant-message').filter({ hasText: '人数已满' })).toBeVisible();
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
  await expect(page.locator('.ant-message').filter({ hasText: '这次行程已经结束' })).toBeVisible();
  await expect(page.getByPlaceholder(APPLY_PLACEHOLDER)).toHaveCount(0);
  await expect(page.locator('.detail-application .action-note')).toHaveText('这次行程已经结束，申请入口已关闭。');
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

  await page.goto('/#/chat/3/2');
  await expect(page.getByText('只有已匹配的同行者可以沟通。')).toBeVisible();

  await page.goto('/#/chat/1/2');
  await expect(page.getByText('这次行程已经结束，聊天转为只读，历史消息仍可查看。')).toBeVisible();
  await expect(page.getByRole('button', { name: /发\s*送/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /全部接受|标记已读|开启推送/ })).toHaveCount(0);
});
