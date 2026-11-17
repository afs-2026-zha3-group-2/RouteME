import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  API,
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
  createUserViaApi,
  loginAsAccount,
  type ApiAccount,
} from './support';

const CHAT_BODY = '.chat-body';

type Session = { context: BrowserContext; page: Page };

async function newSession(browser: Browser): Promise<Session> {
  const context = await browser.newContext();
  return { context, page: await context.newPage() };
}

/** 通知断言都走 API 现场创建的用户与行程，避免依赖种子行号。 */
async function createAccounts(page: Page, ...names: string[]): Promise<ApiAccount[]> {
  const stamp = Date.now().toString().slice(-6);
  const accounts: ApiAccount[] = [];
  for (const name of names) {
    accounts.push(await createUserViaApi(page, `${name}${stamp}`));
  }
  return accounts;
}

/** 打开首页并等外壳就绪；铃铛只在外壳挂载后存在。 */
async function openShell(page: Page, account: ApiAccount): Promise<void> {
  await loginAsAccount(page, account);
  await expect(page.getByTestId('notification-bell')).toBeVisible();
}

async function openPanel(page: Page): Promise<void> {
  await page.getByTestId('notification-bell').click();
  await expect(page.getByTestId('notification-panel')).toBeVisible();
}

async function closePanel(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('notification-panel')).toBeHidden();
}

async function rejectApplicationViaApi(
  page: Page,
  publisherId: number,
  tripId: number,
  applicantId: number,
): Promise<void> {
  const listResponse = await page.request.get(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(listResponse.ok()).toBeTruthy();
  const applications = (await listResponse.json()) as { id: number; applicant: { id: number } }[];
  const target = applications.find((application) => application.applicant.id === applicantId);
  expect(target).toBeTruthy();
  const response = await page.request.post(`${API}/applications/${target!.id}/reject`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(response.ok()).toBeTruthy();
}

async function sendMessageViaApi(
  page: Page,
  senderId: number,
  tripId: number,
  receiverId: number,
  content: string,
): Promise<void> {
  const response = await page.request.post(`${API}/trips/${tripId}/messages`, {
    headers: { 'X-User-Id': String(senderId), 'Content-Type': 'application/json' },
    data: { receiver_id: receiverId, content },
  });
  expect(response.status()).toBe(201);
}

type Counts = { total: number; application: number; message: number };
type NotificationItem = {
  id: number;
  type: string;
  text: string;
  read: boolean;
  actor: { id: number };
  trip_id: number;
};

async function notificationsViaApi(
  page: Page,
  userId: number,
): Promise<{ items: NotificationItem[]; counts: Counts }> {
  const response = await page.request.get(`${API}/notifications`, {
    headers: { 'X-User-Id': String(userId) },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { items: NotificationItem[]; counts: Counts };
}

/** 两人已成行，可互发消息。 */
async function pairUp(
  page: Page,
  publisher: ApiAccount,
  applicant: ApiAccount,
  title: string,
): Promise<{ id: number }> {
  const trip = await createTripViaApi(page, publisher.id, title);
  await applyViaApi(page, applicant.id, trip.id);
  await acceptApplicationViaApi(page, publisher.id, trip.id, applicant.id);
  return trip;
}

test('[M1] an application reaches the publisher badge within three seconds', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, applicant] = await createAccounts(a.page, '发布者', '申请者');
  const title = `E2E 申请到达 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title);

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveCount(0);

  await applyViaApi(b.page, applicant.id, trip.id);

  const badge = a.page.getByTestId('notification-badge');
  await expect(badge).toHaveText('1', { timeout: 3000 });
  await expect(a.page.locator('.ant-message-notice-title')).toContainText(
    `「${applicant.nickname}」申请加入「${title}」`,
    { timeout: 3000 },
  );

  await openPanel(a.page);
  await expect(a.page.getByTestId('notification-item')).toContainText(
    `「${applicant.nickname}」申请加入「${title}」`,
  );
});

test('[M2] accept and reject each notify the applicant', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const c = await newSession(browser);
  const [publisher, accepted, rejected] = await createAccounts(a.page, '发布者', '被接受', '被拒绝');
  const title = `E2E 裁决 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title);
  await applyViaApi(b.page, accepted.id, trip.id);
  await applyViaApi(c.page, rejected.id, trip.id);

  await openShell(b.page, accepted);
  await acceptApplicationViaApi(a.page, publisher.id, trip.id, accepted.id);

  await expect(b.page.getByTestId('notification-badge')).toHaveText('1', { timeout: 3000 });
  await openPanel(b.page);
  await expect(b.page.getByTestId('notification-item')).toContainText(
    `「${publisher.nickname}」接受了你的申请（「${title}」）`,
  );

  await openShell(c.page, rejected);
  await rejectApplicationViaApi(a.page, publisher.id, trip.id, rejected.id);

  await expect(c.page.getByTestId('notification-badge')).toHaveText('1', { timeout: 3000 });
  await openPanel(c.page);
  await expect(c.page.getByTestId('notification-item')).toContainText(
    `「${publisher.nickname}」拒绝了你的申请（「${title}」）`,
  );
});

test('[M3] a message outside chat lights the chat badges and toasts', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, applicant] = await createAccounts(a.page, '发布者', '同行');
  const title = `E2E 消息到达 ${Date.now()}`;
  const trip = await pairUp(a.page, publisher, applicant, title);

  await openShell(a.page, publisher);
  await a.page.goto('/#/map');
  await expect(a.page.getByTestId('rail-chat-badge')).toHaveCount(0);

  await sendMessageViaApi(b.page, applicant.id, trip.id, publisher.id, '地图页也能收到吗？');

  await expect(a.page.getByTestId('rail-chat-badge')).toHaveText('1', { timeout: 3000 });
  await expect(a.page.getByTestId('tab-chat-badge')).toHaveText('1');
  await expect(a.page.locator('.ant-message-notice-title')).toContainText(
    `「${applicant.nickname}」发来一条消息（「${title}」）`,
    { timeout: 3000 },
  );

  await a.page.goto(`/#/chat/${trip.id}/${applicant.id}`);
  const row = a.page.locator('.chat-item', { hasText: applicant.nickname });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('chat-unread-badge')).toHaveCount(0);
  await expect(a.page.getByTestId('rail-chat-badge')).toHaveCount(0);
});

test('[M4] counts split per type and self messages are refused', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, companion, pending] = await createAccounts(a.page, '发布者', '同行', '待处理');
  const title = `E2E 计数拆分 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title);
  await applyViaApi(b.page, companion.id, trip.id);
  await acceptApplicationViaApi(a.page, publisher.id, trip.id, companion.id);
  await applyViaApi(b.page, pending.id, trip.id);

  await openShell(a.page, publisher);
  for (const content of ['第一条', '第二条', '第三条']) {
    await sendMessageViaApi(b.page, companion.id, trip.id, publisher.id, content);
  }

  await expect(a.page.getByTestId('notification-badge')).toHaveText('5', { timeout: 3000 });
  await expect(a.page.getByTestId('rail-chat-badge')).toHaveText('3');
  await expect(a.page.getByTestId('tab-chat-badge')).toHaveText('3');

  const snapshot = await notificationsViaApi(a.page, publisher.id);
  expect(snapshot.counts).toEqual({ total: 5, application: 2, message: 3 });

  // S23-5：自消息在准入层被拒，且不产生通知。
  const selfMessage = await a.page.request.post(`${API}/trips/${trip.id}/messages`, {
    headers: { 'X-User-Id': String(publisher.id), 'Content-Type': 'application/json' },
    data: { receiver_id: publisher.id, content: '发给自己' },
  });
  expect(selfMessage.status()).toBe(403);
  expect((await notificationsViaApi(a.page, publisher.id)).counts).toEqual({
    total: 5,
    application: 2,
    message: 3,
  });
});

test('[M5] reading one, re-reading and reading all converge without rebound', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, first, second] = await createAccounts(a.page, '发布者', '申请一', '申请二');
  const title = `E2E 标读 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title);
  await applyViaApi(b.page, first.id, trip.id);
  await applyViaApi(b.page, second.id, trip.id);

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveText('2', { timeout: 3000 });
  await openPanel(a.page);
  await expect(a.page.getByTestId('notification-item')).toHaveCount(2);

  const before = await notificationsViaApi(a.page, publisher.id);
  const firstItem = before.items[0];
  expect(firstItem).toBeTruthy();

  await a.page.getByTestId('notification-item').first().click();
  await expect(a.page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(a.page.getByTestId('notification-badge')).toHaveText('1');

  // 重复标读同一条：服务端计数不变（幂等）。
  const repeat = await a.page.request.post(`${API}/notifications/${firstItem.id}/read`, {
    headers: { 'X-User-Id': String(publisher.id) },
  });
  expect(repeat.ok()).toBeTruthy();
  expect(((await repeat.json()) as Counts).total).toBe(1);

  await a.page.goto('/');
  await expect(a.page.getByTestId('notification-badge')).toHaveText('1');
  await openPanel(a.page);
  await a.page.getByTestId('notification-mark-all').click();
  await expect(a.page.getByTestId('notification-badge')).toHaveCount(0);
  await expect(a.page.locator('.notification-item.is-unread')).toHaveCount(0);
  await expect(a.page.locator('.notification-unread-flag')).toHaveCount(0);

  // 刷新（新连接 + 新快照）后计数不回弹。
  await a.page.reload();
  await expect(a.page.getByTestId('notification-bell')).toBeVisible();
  await expect(a.page.getByTestId('notification-badge')).toHaveCount(0);
  await openPanel(a.page);
  await expect(a.page.locator('.notification-item.is-unread')).toHaveCount(0);
  await expect(a.page.locator('.notification-unread-flag')).toHaveCount(0);
});

test('[M6] opening one conversation only clears that conversation', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, companion, other] = await createAccounts(a.page, '发布者', '同行甲', '同行乙');
  const title = `E2E 会话范围 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title);
  await applyViaApi(b.page, companion.id, trip.id);
  await applyViaApi(b.page, other.id, trip.id);
  await acceptApplicationViaApi(a.page, publisher.id, trip.id, companion.id);
  await acceptApplicationViaApi(a.page, publisher.id, trip.id, other.id);
  await sendMessageViaApi(b.page, companion.id, trip.id, publisher.id, '甲的消息');
  await sendMessageViaApi(b.page, other.id, trip.id, publisher.id, '乙的消息');

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveText('4', { timeout: 3000 });

  await a.page.goto(`/#/chat/${trip.id}/${companion.id}`);
  const companionRow = a.page.locator('.chat-item', { hasText: companion.nickname });
  const otherRow = a.page.locator('.chat-item', { hasText: other.nickname });
  await expect(companionRow).toBeVisible();
  await expect(otherRow).toBeVisible();

  await expect(a.page.getByTestId('notification-badge')).toHaveText('3');
  await expect(companionRow.getByTestId('chat-unread-badge')).toHaveCount(0);
  await expect(otherRow.getByTestId('chat-unread-badge')).toHaveText('1');

  const snapshot = await notificationsViaApi(a.page, publisher.id);
  expect(snapshot.counts).toEqual({ total: 3, application: 2, message: 1 });
});

test('[M7] refresh keeps counts and does not duplicate entries', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, applicant] = await createAccounts(a.page, '发布者', '申请者');
  const title = `E2E 重连 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title);
  await applyViaApi(b.page, applicant.id, trip.id);

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveText('1', { timeout: 3000 });
  await openPanel(a.page);
  await expect(a.page.getByTestId('notification-item')).toHaveCount(1);

  await a.page.reload();
  await expect(a.page.getByTestId('notification-badge')).toHaveText('1');
  await openPanel(a.page);
  await expect(a.page.getByTestId('notification-item')).toHaveCount(1);

  // 让 EventSource 重连后的对账快照落地，仍然只有一条。
  await a.page.waitForTimeout(1200);
  await expect(a.page.getByTestId('notification-item')).toHaveCount(1);
});

test('[M8] the open conversation updates instantly and suppresses the toast', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, companion] = await createAccounts(a.page, '发布者', '同行');
  const title = `E2E 当前会话 ${Date.now()}`;
  const trip = await pairUp(a.page, publisher, companion, title);

  await openShell(a.page, publisher);
  await a.page.goto(`/#/chat/${trip.id}/${companion.id}`);
  await expect(a.page.locator('.chat-item').first()).toBeVisible();

  await sendMessageViaApi(b.page, companion.id, trip.id, publisher.id, '不用刷新就应该出现');

  await expect(a.page.locator(CHAT_BODY).getByText('不用刷新就应该出现')).toBeVisible({
    timeout: 3000,
  });
  await expect(a.page.locator('.ant-message-notice-title')).toHaveCount(0);
  const row = a.page.locator('.chat-item', { hasText: companion.nickname });
  await expect(row.getByTestId('chat-unread-badge')).toHaveCount(0);
  expect((await notificationsViaApi(a.page, publisher.id)).counts.message).toBe(0);
});

test('[M9] producer response to badge render stays within the three second budget', async ({
  browser,
}) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, applicant] = await createAccounts(a.page, '发布者', '申请者');
  const title = `E2E 三秒口径 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title);

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveCount(0);

  const startedAt = Date.now();
  await applyViaApi(b.page, applicant.id, trip.id);
  const producedAt = Date.now();
  await expect(a.page.getByTestId('notification-badge')).toHaveText('1', { timeout: 3000 });
  const renderedAt = Date.now();

  expect(producedAt - startedAt).toBeLessThanOrEqual(3000);
  expect(renderedAt - producedAt).toBeLessThanOrEqual(3000);
});

test('[M10] narrow screens keep the tab badge, the bell panel and avoid horizontal scroll', async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const b = await newSession(browser);
  const page = await context.newPage();
  const [publisher, companion] = await createAccounts(page, '发布者', '同行');
  const title = `E2E 窄屏 ${Date.now()}`;
  const trip = await pairUp(page, publisher, companion, title);
  await sendMessageViaApi(b.page, companion.id, trip.id, publisher.id, '窄屏消息');

  await openShell(page, publisher);
  await expect(page.getByTestId('tab-chat-badge')).toHaveText('1', { timeout: 3000 });
  await expect(page.getByTestId('rail-chat-badge')).toHaveText('1');

  await page.getByTestId('notification-bell').click();
  const panel = page.getByTestId('notification-panel');
  await expect(panel).toBeVisible();
  // 390px 下弹层右对齐到铃铛会把面板顶出屏幕左侧：等展开后断言左右边界。
  await expect
    .poll(
      async () => {
        const box = await panel.boundingBox();
        if (box === null || box.width <= 100) {
          return 'animating';
        }
        if (box.x < 0) {
          return `left:${Math.round(box.x)}`;
        }
        if (box.x + box.width > 390 + 1) {
          return `right:${Math.round(box.x + box.width)}`;
        }
        return 'inside';
      },
      { message: '390px 面板完整落在视口内', timeout: 5000 },
    )
    .toBe('inside');
  await closePanel(page);
  await expect(page.getByTestId('notification-bell')).toBeFocused();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await context.close();
  await b.context.close();
});