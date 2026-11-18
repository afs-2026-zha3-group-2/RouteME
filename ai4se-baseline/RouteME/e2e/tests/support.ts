import { expect, type Page } from '@playwright/test';

export const API = '/api';

/** 管理后台种子账号：仅供本地演示，凭据只登记在交付说明里。 */
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin12345';

export type ApiAccount = { id: number; token: string; nickname: string };

export async function createUserViaApi(
  page: Page,
  nickname = `e2e_${Date.now()}`,
): Promise<ApiAccount> {
  const response = await page.request.post(`${API}/auth/register`, {
    data: {
      username: `e2e${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000)}`,
      password: 'e2e-pass-123',
      nickname,
    },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as {
    token: string;
    user: { id: number; nickname: string };
  };
  return { id: session.user.id, token: session.token, nickname: session.user.nickname };
}

export async function loginAsAdmin(page: Page): Promise<ApiAccount> {
  const response = await page.request.post(`${API}/auth/login`, {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const session = (await response.json()) as {
    token: string;
    user: { id: number; nickname: string };
  };
  await page.goto('/');
  await page.evaluate((value) => {
    window.localStorage.setItem('routeme.currentUserId', String(value.userId));
    window.localStorage.setItem('routeme.authToken', value.token);
  }, { userId: session.user.id, token: session.token });
  await page.reload();
  return {
    id: session.user.id,
    token: session.token,
    nickname: session.user.nickname,
  };
}

/** 直接以账号 token 打开页面：用户侧客服与举报页都走 Bearer。 */
export async function loginAsAccount(page: Page, account: ApiAccount): Promise<void> {
  await page.goto('/');
  await page.evaluate((value) => {
    window.localStorage.setItem('routeme.currentUserId', String(value.userId));
    window.localStorage.setItem('routeme.authToken', value.token);
  }, { userId: account.id, token: account.token });
  await page.reload();
}

export async function setUserStatusViaApi(
  page: Page,
  adminToken: string,
  userId: number,
  body: {
    action: 'SUSPEND' | 'BAN' | 'RESTORE';
    reason?: string | null;
    ban_reason_code?: string | null;
    ban_reason_note?: string | null;
    ban_expires_at?: string | null;
  },
) {
  const response = await page.request.post(`${API}/admin/users/${userId}/status`, {
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    data: body,
  });
  return response;
}

export async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

export async function switchUser(page: Page, userId: number) {
  await loginAs(page, userId);
  await page.reload();
}

export function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): string {
  return isoDaysFromToday(0);
}

type CreateTripOptions = {
  capacity?: number;
  meeting?: { area?: string; time?: string };
  daysFromToday?: number;
};

export async function createTripViaApi(
  page: Page,
  publisherId: number,
  title: string,
  options: CreateTripOptions = {},
) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisherId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: isoDaysFromToday(options.daysFromToday ?? 0),
      end_date: isoDaysFromToday(options.daysFromToday ?? 0),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: options.capacity ?? 3,
      meeting_areas: options.meeting?.area ? [options.meeting.area] : null,
      meeting_time: options.meeting?.time ?? null,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

export async function applyViaApi(
  page: Page,
  userId: number,
  tripId: number,
  message: string | null = null,
) {
  const response = await page.request.post(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(userId), 'Content-Type': 'application/json' },
    data: { message },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

/** 发布页目的地级联：先点开「目的地」，再依次选省、市。 */
export async function pickDestination(page: Page, province: string, city: string) {
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('.area-option', { hasText: province }).first().click();
  await page.locator('.area-option', { hasText: city }).first().click();
}

/** 途经点 / 集合地点的离线地名选择：输入后等候选出现，再点中匹配项。 */
export async function pickPlace(page: Page, field: string, name: string) {
  const input = page.getByRole('textbox', { name: new RegExp(field) });
  await input.fill(name);
  const option = page.locator('.amap-search-item', { hasText: name }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator('.place-chip-name', { hasText: name }).first()).toBeVisible();
}

export async function acceptApplicationViaApi(
  page: Page,
  publisherId: number,
  tripId: number,
  applicantId: number,
) {
  const listResponse = await page.request.get(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(listResponse.ok()).toBeTruthy();
  const applications = (await listResponse.json()) as {
    id: number;
    status?: string;
    applicant: { id: number };
  }[];
  // 同一行程可能有一条旧的 LEFT 与一条新的 PENDING：优先接受待处理那条。
  const target =
    applications.find(
      (application) => application.applicant.id === applicantId && application.status === 'pending',
    ) ?? [...applications].reverse().find((application) => application.applicant.id === applicantId);
  expect(target).toBeTruthy();
  const response = await page.request.post(`${API}/applications/${target!.id}/accept`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(response.ok()).toBeTruthy();
}