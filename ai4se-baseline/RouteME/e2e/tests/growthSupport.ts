import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';
import { createTripViaApi } from './support';

const HERE = dirname(fileURLToPath(import.meta.url));
export const API = process.env.ROUTEME_E2E_API_BASE ? `${process.env.ROUTEME_E2E_API_BASE}/api` : '/api';
const DB_PATH = process.env.ROUTEME_E2E_DB ?? resolve(HERE, '../../SqlLite/routeme.db');
const PASSWORD = 'growth-pass-123';

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}

export type Account = { userId: number; token: string; nickname: string };

/** 每个用例现注册账号：成长从 LV1 / 0 EXP 开始，可重复执行，不污染演示账号。 */
export async function registerAccount(page: Page, nicknamePrefix = '成长'): Promise<Account> {
  const nickname = `${nicknamePrefix}${uniqueSuffix()}`;
  const response = await page.request.post(`${API}/auth/register`, {
    data: { username: `growth${uniqueSuffix()}`, password: PASSWORD, nickname },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { token: string; user: { id: number } };
  markStudentVerified(session.user.id);
  return { userId: session.user.id, token: session.token, nickname };
}

/**
 * main 的 student-verification 门禁要求发布 / 申请 / 聊天前完成认证；
 * 成长 E2E 不覆盖认证流程，注册后直接把账号置为已认证（同 `seedExp` 的造数口径）。
 */
function markStudentVerified(userId: number): void {
  const database = new DatabaseSync(DB_PATH);
  try {
    database.exec('PRAGMA busy_timeout = 5000;');
    database.prepare('UPDATE app_users SET student_verified = 1 WHERE id = ?').run(userId);
  } finally {
    database.close();
  }
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

export type GrowthEntry = { user_id: number; level: number };

export type ProfileGrowth = {
  level: number;
  exp?: number;
  exp_to_next?: number | null;
  max_level?: boolean;
};

export async function readGrowthEntries(
  page: Page,
  callerId: number,
  ids: number[],
): Promise<GrowthEntry[]> {
  const response = await page.request.get(`${API}/users/growth?ids=${ids.join(',')}`, {
    headers: { 'X-User-Id': String(callerId) },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as GrowthEntry[];
}

export async function readProfileGrowth(
  page: Page,
  callerId: number,
  userId: number,
): Promise<ProfileGrowth> {
  const response = await page.request.get(`${API}/users/${userId}/profile`, {
    headers: { 'X-User-Id': String(callerId) },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { growth?: ProfileGrowth };
  expect(body.growth, 'profile should carry growth').toBeTruthy();
  return body.growth!;
}

/**
 * 造经验：产品侧单日增量有上限（发布 +10 / 点赞分档），无法在一天内堆到 LV3。
 * 按 atdd-design §4 直接改 `user_growth_account.exp_total`，并补一条种子账本行，
 * 维持 `exp_after = exp_before + applied_delta` 等式。
 */
export function seedExp(userId: number, exp: number): void {
  const database = new DatabaseSync(DB_PATH);
  try {
    database.exec('PRAGMA busy_timeout = 5000;');
    const row = database
      .prepare('SELECT exp_total FROM user_growth_account WHERE user_id = ?')
      .get(userId) as { exp_total: number } | undefined;
    const before = row === undefined ? 0 : Number(row.exp_total);
    const stamp = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO user_growth_account (user_id, exp_total, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET exp_total = excluded.exp_total, updated_at = excluded.updated_at`,
      )
      .run(userId, exp, stamp, stamp);
    database
      .prepare(
        `INSERT INTO growth_exp_ledger
           (user_id, reason_code, applied_delta, exp_before, exp_after, related_type, related_id, idempotency_key, occurred_at)
         VALUES (?, 'SYSTEM_ADJUST', ?, ?, ?, NULL, NULL, ?, ?)`,
      )
      .run(userId, exp - before, before, exp, `e2e-seed-${userId}-${uniqueSuffix()}`, stamp);
  } finally {
    database.close();
  }
}

/** 当天建行程再用 `complete` 标记结束：发布页不接受过去日期。 */
export async function createCompletedTrip(page: Page, publisherId: number, title: string) {
  const trip = await createTripViaApi(page, publisherId, title);
  const completed = await page.request.post(`${API}/trips/${trip.id}/complete`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(completed.ok()).toBeTruthy();
  return trip;
}

/** 造一条未来行程（首页可见、可接受申请）。 */
export async function createFutureTrip(
  page: Page,
  publisherId: number,
  title: string,
  capacity = 3,
) {
  return createTripViaApi(page, publisherId, title, { daysFromToday: 3, capacity });
}

const EXPERIENCE_BODY = {
  content: '整条线基本没有爬升，日落前四十分钟到海边刚好。',
  intensity: 'moderate',
  advice: '带一件防风外套。',
};

export async function publishExperience(
  page: Page,
  authorId: number,
  tripId: number,
): Promise<number> {
  const response = await page.request.post(`${API}/trips/${tripId}/experiences`, {
    headers: { 'X-User-Id': String(authorId), 'Content-Type': 'application/json' },
    data: EXPERIENCE_BODY,
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { id: number }).id;
}

export async function likeExperience(
  page: Page,
  userId: number,
  experienceId: number,
): Promise<void> {
  const response = await page.request.post(`${API}/experiences/${experienceId}/likes`, {
    headers: { 'X-User-Id': String(userId) },
  });
  expect(response.ok()).toBeTruthy();
}
