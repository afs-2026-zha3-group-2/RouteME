import { expect, type Page } from '@playwright/test';
import { acceptApplicationViaApi, applyViaApi, createTripViaApi } from './support';

// 与 support.ts 保持一致：本地直连前端同源的 /api。
const API = '/api';
const PASSWORD = 'credit-pass-123';

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}

export type Account = { username: string; userId: number; token: string };

export type CreditEntry = {
  user_id: number;
  credit_score: number;
  credit_level: string;
  credit_restricted: boolean;
};

/** 每个用例现注册账号：信用分从 80 开始，可重复执行，不污染演示账号。 */
export async function registerViaApi(page: Page, nicknamePrefix = '信用'): Promise<Account> {
  const username = `credit${uniqueSuffix()}`;
  const response = await page.request.post(`${API}/auth/register`, {
    data: { username, password: PASSWORD, nickname: `${nicknamePrefix}${uniqueSuffix()}` },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { token: string; user: { id: number } };
  return { username, userId: session.user.id, token: session.token };
}

/** 把身份写进 localStorage，再落到首页。 */
export async function useAccount(page: Page, account: Account): Promise<void> {
  await page.addInitScript(
    ({ id, token }) => {
      window.localStorage.setItem('routeme.currentUserId', String(id));
      window.localStorage.setItem('routeme.authToken', token);
    },
    { id: account.userId, token: account.token },
  );
  await page.goto('/');
}

export async function readCredit(page: Page, userId: number): Promise<CreditEntry> {
  const response = await page.request.get(`${API}/users/credits?ids=${userId}`, {
    headers: { 'X-User-Id': String(userId) },
  });
  expect(response.ok()).toBeTruthy();
  const entries = (await response.json()) as CreditEntry[];
  const mine = entries.find((entry) => entry.user_id === userId);
  expect(mine).toBeTruthy();
  return mine!;
}

export async function leaveViaApi(
  page: Page,
  userId: number,
  tripId: number,
  reason: 'personal' | 'force_majeure' | 'safety',
) {
  const response = await page.request.post(`${API}/trips/${tripId}/leave`, {
    headers: { 'X-User-Id': String(userId), 'Content-Type': 'application/json' },
    data: { reason },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { credit_score: number; applied_delta: number };
}

/** 本地时间 "YYYY-MM-DDTHH:mm"，用于集合时间（服务端按 Asia/Shanghai 解释）。 */
export function localDateTimeAfterHours(hours: number): string {
  const date = new Date(Date.now() + hours * 3600 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

type AcceptedTripOptions = {
  capacity?: number;
  daysFromToday?: number;
  meeting?: { area?: string; time?: string };
};

/** 造一条「申请 → 接受」的已匹配行程，返回行程 id。 */
export async function acceptedTrip(
  page: Page,
  publisher: Account,
  applicant: Account,
  title: string,
  options: AcceptedTripOptions = {},
): Promise<{ id: number }> {
  const trip = await createTripViaApi(page, publisher.userId, title, options);
  await applyViaApi(page, applicant.userId, trip.id, '想一起走。');
  await acceptApplicationViaApi(page, publisher.userId, trip.id, applicant.userId);
  return trip;
}
