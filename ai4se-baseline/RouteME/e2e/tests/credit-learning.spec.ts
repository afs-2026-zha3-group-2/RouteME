import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { pickDestination, verifyStudentViaApi } from './support';
import { installAmapStub } from './support/amapStub';

/**
 * REQ-027 / add-credit-recovery 的端到端口径（A1 / A6 / A24 / A25 / D6）。
 *
 * 造分：产品侧没有扣分入口（扣分事件是 non-goal），所以按 atdd-design §4 用 SQL
 * 直接改 `user_credit_account.score`，并补一条 `SYSTEM_ADJUST` 账本行保证
 * `score_after = score_before + applied_delta` 等式成立，不伪造业务事件类型。
 *
 * 题库：答案只在服务端（`credit/learning-questions.json`），E2E 按题面回查答案，
 * 前 8 题答对、后 2 题故意答错，落 A12 的「恰好 8 对通过」边界。
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const API = process.env.ROUTEME_E2E_API_BASE ? `${process.env.ROUTEME_E2E_API_BASE}/api` : '/api';
const DB_PATH = process.env.ROUTEME_E2E_DB ?? resolve(HERE, '../../SqlLite/routeme.db');
const BANK_PATH = resolve(HERE, '../../backend/src/main/resources/credit/learning-questions.json');
const PASSWORD = 'credit-learn-123';
const PERFECT = 10;
const OPTION_COUNT = 4;

type BankQuestion = { question: string; answerIndex: number };

const ANSWER_KEY = new Map<string, number>(
  (JSON.parse(readFileSync(BANK_PATH, 'utf8')) as BankQuestion[]).map((item) => [
    item.question,
    item.answerIndex,
  ]),
);

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}

async function registerViaApi(page: Page): Promise<{ userId: number; token: string }> {
  const response = await page.request.post(`${API}/auth/register`, {
    data: { username: `learn${uniqueSuffix()}`, password: PASSWORD, nickname: `学习${uniqueSuffix()}` },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { token: string; user: { id: number } };
  await verifyStudentViaApi(page, session);
  return { userId: session.user.id, token: session.token };
}

/** 造分：新库靠 upsert 建账户行，老账户直接改分；账本补一行 SYSTEM_ADJUST 维持等式。 */
function seedScore(userId: number, score: number): void {
  const database = new DatabaseSync(DB_PATH);
  try {
    database.exec('PRAGMA busy_timeout = 5000;');
    const row = database.prepare('SELECT score FROM user_credit_account WHERE user_id = ?').get(userId) as
      | { score: number }
      | undefined;
    const before = row === undefined ? 80 : Number(row.score);
    const stamp = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO user_credit_account (user_id, score, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`,
      )
      .run(userId, score, stamp, stamp);
    database
      .prepare(
        `INSERT INTO credit_ledger
           (user_id, reason_code, applied_delta, score_before, score_after, related_type, related_id, idempotency_key, occurred_at)
         VALUES (?, 'SYSTEM_ADJUST', ?, ?, ?, NULL, NULL, ?, ?)`,
      )
      .run(userId, score - before, before, score, `e2e-seed-${userId}-${Date.now()}`, stamp);
  } finally {
    database.close();
  }
}

/** 按既有 E2E 约定把身份写进 localStorage，再落到首页。 */
async function useAccount(page: Page, account: { userId: number; token: string }): Promise<void> {
  await page.addInitScript(
    ({ id, token }) => {
      window.localStorage.setItem('routeme.currentUserId', String(id));
      window.localStorage.setItem('routeme.authToken', token);
    },
    { id: account.userId, token: account.token },
  );
  await page.goto('/');
}

async function fillPublishForm(page: Page, title: string): Promise<void> {
  await page.getByLabel('标题').fill(title);
  await pickDestination(page, '广东省', '珠海市');
  await addRouteStop(page, '香洲港');
  await addRouteStop(page, '情侣路');
}

/** 发布页已改为地图路线编辑器：通过编辑器搜索框加途经点（AMap 替身提供 POI）。 */
async function addRouteStop(page: Page, name: string): Promise<void> {
  const editor = page.locator('.publish-route-editor');
  await editor.locator('#trip-stops').fill(name);
  const option = editor.locator('.amap-search-item').filter({ hasText: name }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(
    editor.locator('.amap-waypoint-text b').filter({ hasText: name }).first(),
  ).toBeVisible();
}

/** 前 `correctCount` 题按题库答案作答，其余故意选相邻选项，用来锁 8 对通过边界。 */
async function answerQuiz(page: Page, correctCount: number): Promise<void> {
  const total = await page.locator('.cl-bar i').count();
  expect(total).toBe(10);
  for (let index = 0; index < total; index += 1) {
    const text = (await page.locator('.cl-q').innerText()).trim();
    const answer = ANSWER_KEY.get(text);
    expect(answer, `题库中没有这道题：${text}`).not.toBeUndefined();
    const pick = index < correctCount ? answer! : (answer! + 1) % OPTION_COUNT;
    await page.locator('.cl-opt').nth(pick).click();
    if (index < total - 1) {
      await page.getByRole('button', { name: '下一题' }).click();
    }
  }
}

test.describe.configure({ mode: 'serial' });

test('45 分全局学习门禁 → 学习通过 → 发布成功', async ({ page }) => {
  await installAmapStub(page);
  const account = await registerViaApi(page);
  seedScore(account.userId, 45);
  await useAccount(page, account);

  const title = `信用恢复行程 ${Date.now()}`;
  // 受限时侧栏保留，但内容区全部换成学习门禁。
  await page.goto('/');
  const gate = page.locator('.credit-gate');
  await expect(gate).toBeVisible();
  await expect(gate).toContainText('账号功能已暂停');
  await expect(gate).toContainText('当前信用分 45 / 100');
  await expect(page.locator('.trip-card')).toHaveCount(0);

  await page.getByRole('link', { name: '发布行程' }).first().click();
  await expect(page).toHaveURL(/#\/trips\/new$/);
  await expect(page.locator('.credit-gate')).toBeVisible();
  await expect(page.getByRole('button', { name: /^发\s*布/ })).toHaveCount(0);

  await page.locator('.credit-gate').getByRole('link', { name: '去安全学习' }).click();
  await expect(page).toHaveURL(/#\/credit\/learning$/);
  await expect(page.locator('.credit-gate')).toHaveCount(0);
  await expect(page.getByText('先花 3 分钟看完这四类风险，再开始答题')).toBeVisible();
  await expect(page.locator('.cl-credit-num')).toHaveText('45 / 100');

  await page.getByRole('button', { name: '我已学完，开始答题' }).click();
  await expect(page.locator('.cl-q')).toBeVisible();
  await answerQuiz(page, PERFECT);
  await page.getByRole('button', { name: '提交作答' }).click();

  await expect(page.locator('.cl-done')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '你已通过安全学习，信用分恢复至 60' }),
  ).toBeVisible();
  await expect(page.locator('.cl-done-score')).toContainText('60');
  await expect(page.getByText(/变更前 45 · 实际变化量 \+15 · 变更后 60/)).toBeVisible();
  await expect(page.locator('.cl-credit-num')).toHaveText('60 / 100');

  await page.getByRole('link', { name: '去发布行程' }).click();
  await expect(page).toHaveURL(/#\/trips\/new$/);
  await fillPublishForm(page, title);
  await page.getByRole('button', { name: /^发\s*布/ }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.goto(`/#/users/${account.userId}`);
  await expect(page.locator('.profile-credit')).toHaveText('信用分：60 / 100 · 信用一般');

  // A25：列表类展示面与个人主页同口径（同一份批量信用接口）。
  await page.goto('/');
  await expect(
    page.locator('.trip-card', { hasText: title }).locator('.tc-credit').first(),
  ).toHaveText('信用分：60 / 100 · 信用一般');
});

test('45 分答对 8 题只部分恢复到 55，门禁仍在', async ({ page }) => {
  const account = await registerViaApi(page);
  seedScore(account.userId, 45);
  await useAccount(page, account);

  await page.goto('/');
  await page.locator('.credit-gate').getByRole('link', { name: '去安全学习' }).click();
  await page.getByRole('button', { name: '我已学完，开始答题' }).click();
  await expect(page.locator('.cl-q')).toBeVisible();
  await answerQuiz(page, 8);
  await page.getByRole('button', { name: '提交作答' }).click();

  await expect(page.locator('.cl-result.is-pass')).toContainText('信用分恢复至 55');
  await expect(page.locator('.cl-result')).toContainText('本次恢复 +10');
  await expect(page.getByRole('link', { name: '去发布行程' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible();

  await page.getByRole('link', { name: '返回首页' }).click();
  await expect(page.locator('.credit-gate')).toContainText('当前信用分 55 / 100');
});

test('62 分深链进入安全学习页只看到「当前无需恢复」', async ({ page }) => {
  const account = await registerViaApi(page);
  seedScore(account.userId, 62);
  await useAccount(page, account);

  await page.goto('/#/credit/learning');

  await expect(page.getByText('当前无需恢复')).toBeVisible();
  await expect(page.getByText('你的信用分是 62，已高于发布阈值 60')).toBeVisible();
  await expect(page.getByText('可以正常发布行程')).toBeVisible();
  await expect(page.getByRole('button', { name: '我已学完，开始答题' })).toHaveCount(0);
  await expect(page.locator('.cl-quota')).toContainText('本月考试 0 / 2');
  await expect(page.locator('.cl-credit-num')).toHaveText('62 / 100');
});

test('低分登录后每个路由都只显示学习门禁，并可跳转学习页', async ({ page }) => {
  const account = await registerViaApi(page);
  seedScore(account.userId, 45);
  await useAccount(page, account);

  for (const path of ['/', '/#/mine', '/#/chat']) {
    await page.goto(path);
    const gate = page.locator('.credit-gate');
    await expect(gate).toBeVisible();
    await expect(gate.locator('.credit-gate-icon')).toBeVisible();
    await expect(gate).toContainText('账号功能已暂停');
    await expect(gate.getByRole('link', { name: '去安全学习' })).toBeVisible();
  }

  // 直接从首页门禁进入学习页，且学习页不重复渲染门禁。
  await page.goto('/');
  await page.locator('.credit-gate').getByRole('link', { name: '去安全学习' }).click();
  await expect(page).toHaveURL(/#\/credit\/learning$/);
  await expect(page.locator('.credit-gate')).toHaveCount(0);
});
