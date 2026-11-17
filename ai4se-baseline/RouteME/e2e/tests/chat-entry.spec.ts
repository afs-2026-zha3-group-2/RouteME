import { expect, test, type Page } from '@playwright/test';

const API = '/api';
const APPLY_PLACEHOLDER = '例如：这条线我走过一半，想补上日落那段，可以帮忙背装备。';

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

async function createTripViaApi(page: Page, publisherId: number, title: string) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisherId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: todayIso(),
      end_date: todayIso(),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

async function acceptApplicationViaApi(
  page: Page,
  publisherId: number,
  tripId: number,
  applicantId: number,
) {
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

test('reaches chat from the rail, the application drawer and the companion list', async ({ page }) => {
  const title = `E2E 聊天入口 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title);

  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await page.getByPlaceholder(APPLY_PLACEHOLDER).fill('想一起拍日落。');
  await page.getByRole('button', { name: '提交同行申请' }).click();
  await expect(page.getByRole('button', { name: '撤回申请' })).toBeVisible();
  await acceptApplicationViaApi(page, 2, created.id, 1);

  // 发布者在申请页看到「进入聊天」，跳转到与申请人的会话。
  await switchUser(page, 2);
  await page.goto(`/#/trips/${created.id}/applications`);
  await expect(page.getByText('已匹配同行')).toBeVisible();
  await page.getByRole('button', { name: '进入聊天' }).click();
  await expect(page).toHaveURL(new RegExp(`#/chat/${created.id}/1$`));
  await expect(page.locator('.chat-item.on', { hasText: title })).toBeVisible();

  // 详情页同行者列表里的「聊天」入口。
  await page.goto(`/#/trips/${created.id}`);
  await page
    .locator('.detail-companions')
    .getByRole('link', { name: '聊天' })
    .click();
  await expect(page).toHaveURL(new RegExp(`#/chat/${created.id}/1$`));

  // 侧边导航「同行消息」进入会话页，默认选中第一个会话。
  await switchUser(page, 1);
  await page.goto('/');
  await page.locator('.rail').getByRole('link', { name: '同行消息' }).click();
  await expect(page).toHaveURL(/#\/chat$/);
  await expect(page.getByRole('heading', { name: '同行消息' })).toBeVisible();
  await expect(page.locator('.chat-item.on')).toBeVisible();
  const firstConversation = await page.locator('.chat-item').first().locator('.ci-trip').textContent();
  await expect(page.locator('.chat-head-trip')).toContainText(firstConversation ?? '');
});
