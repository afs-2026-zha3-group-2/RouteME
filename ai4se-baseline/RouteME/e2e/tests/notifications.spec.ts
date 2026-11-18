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

/** 八类计数齐备、零值不省略；断言时只覆盖关心的类型。 */
function typeCounts(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    TRIP: 0,
    APPLICATION: 0,
    CHAT: 0,
    CREDIT: 0,
    REPORT: 0,
    ACCOUNT: 0,
    SERVICE: 0,
    SYSTEM: 0,
    ...overrides,
  };
}

type Counts = { total: number; by_type: Record<string, number> };
type NotificationTarget = {
  kind: string;
  trip_id: number | null;
  other_user_id: number | null;
  application_id: number | null;
  report_id: number | null;
  session_id: number | null;
};
type NotificationItem = {
  id: number;
  type: string;
  event: string;
  title: string;
  content: string;
  priority: string;
  status: 'UNREAD' | 'READ';
  created_at: string;
  read_at: string | null;
  actor: { id: number } | null;
  trip_id: number | null;
  trip_title: string | null;
  application_id: number | null;
  message_id: number | null;
  report_id: number | null;
  session_id: number | null;
  target: NotificationTarget;
  related_available: boolean;
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
  options: { daysFromToday?: number; capacity?: number } = {},
): Promise<{ id: number }> {
  const trip = await createTripViaApi(page, publisher.id, title, options);
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
  await expect(a.page.getByTestId('notification-item')).toContainText('新的同行申请');
  await expect(a.page.getByTestId('notification-item')).toContainText(
    `「${applicant.nickname}」申请加入「${title}」`,
  );

  const snapshot = await notificationsViaApi(a.page, publisher.id);
  expect(snapshot.counts).toEqual({
    total: 1,
    by_type: typeCounts({ APPLICATION: 1 }),
  });
  expect(snapshot.items[0]?.type).toBe('APPLICATION');
  expect(snapshot.items[0]?.event).toBe('application_received');
  expect(snapshot.items[0]?.target.kind).toBe('applications');
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
  await expect(b.page.getByTestId('notification-item')).toContainText('申请已通过');
  await expect(b.page.getByTestId('notification-item')).toContainText(
    `「${publisher.nickname}」接受了你的申请（「${title}」）`,
  );

  await openShell(c.page, rejected);
  await rejectApplicationViaApi(a.page, publisher.id, trip.id, rejected.id);

  await expect(c.page.getByTestId('notification-badge')).toHaveText('1', { timeout: 3000 });
  await openPanel(c.page);
  await expect(c.page.getByTestId('notification-item')).toContainText('申请未通过');
  await expect(c.page.getByTestId('notification-item')).toContainText(
    `「${publisher.nickname}」拒绝了你的申请（「${title}」）`,
  );
});

test('[M3] a message outside chat lights the chat badges and toasts', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, applicant] = await createAccounts(a.page, '发布者', '同行');
  const title = `E2E 消息到达 ${Date.now()}`;
  const trip = await pairUp(a.page, publisher, applicant, title, { daysFromToday: 1 });

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
  await expect(a.page.getByTestId('rail-notification-badge')).toHaveText('5');

  const snapshot = await notificationsViaApi(a.page, publisher.id);
  expect(snapshot.counts).toEqual({
    total: 5,
    by_type: typeCounts({ APPLICATION: 2, CHAT: 3 }),
  });

  // S23-5：自消息在准入层被拒，且不产生通知。
  const selfMessage = await a.page.request.post(`${API}/trips/${trip.id}/messages`, {
    headers: { 'X-User-Id': String(publisher.id), 'Content-Type': 'application/json' },
    data: { receiver_id: publisher.id, content: '发给自己' },
  });
  expect(selfMessage.status()).toBe(403);
  expect((await notificationsViaApi(a.page, publisher.id)).counts).toEqual({
    total: 5,
    by_type: typeCounts({ APPLICATION: 2, CHAT: 3 }),
  });
});

test('[M5] reading one, re-reading and reading all converge without rebound', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, first, second] = await createAccounts(a.page, '发布者', '申请一', '申请二');
  const title = `E2E 标读 ${Date.now()}`;
  // 明天的行程：点开行程详情不会惰性物化 ONGOING / 安全提醒，计数口径保持稳定。
  const trip = await createTripViaApi(a.page, publisher.id, title, { daysFromToday: 1 });
  await applyViaApi(b.page, first.id, trip.id);
  await applyViaApi(b.page, second.id, trip.id);

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveText('2', { timeout: 3000 });
  const initial = await notificationsViaApi(a.page, publisher.id);
  expect(initial.counts).toEqual({
    total: 2,
    by_type: typeCounts({ APPLICATION: 2 }),
  });
  await openPanel(a.page);
  await expect(a.page.getByTestId('notification-item')).toHaveCount(2);

  const before = await notificationsViaApi(a.page, publisher.id);
  const firstItem = before.items[0];
  expect(firstItem).toBeTruthy();
  expect(firstItem?.event).toBe('application_received');

  await a.page.getByTestId('notification-item').first().click();
  await expect(a.page).toHaveURL(new RegExp(`#/trips/${trip.id}/applications$`));
  await expect(a.page.getByTestId('notification-badge')).toHaveText('1');

  // 重复标读同一条：服务端计数不变（幂等）。
  const repeat = await a.page.request.post(`${API}/notifications/${firstItem!.id}/read`, {
    headers: { 'X-User-Id': String(publisher.id) },
  });
  expect(repeat.ok()).toBeTruthy();
  expect((await repeat.json()) as Counts).toEqual({
    total: 1,
    by_type: typeCounts({ APPLICATION: 1 }),
  });

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

  const after = await notificationsViaApi(a.page, publisher.id);
  expect(after.counts).toEqual({ total: 0, by_type: typeCounts() });
  expect(after.items).toHaveLength(2);
  expect(after.items.every((item) => item.status === 'READ')).toBe(true);
  // 标读只动通知，不改业务状态：行程与申请仍在。
  const detail = await a.page.request.get(`${API}/trips/${trip.id}`, {
    headers: { 'X-User-Id': String(publisher.id) },
  });
  expect(detail.ok()).toBeTruthy();
  const applications = await a.page.request.get(`${API}/trips/${trip.id}/applications`, {
    headers: { 'X-User-Id': String(publisher.id) },
  });
  expect(applications.ok()).toBeTruthy();
  expect(((await applications.json()) as { status: string }[]).length).toBe(2);
});

test('[M6] opening one conversation only clears that conversation', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, companion, other] = await createAccounts(a.page, '发布者', '同行甲', '同行乙');
  const title = `E2E 会话范围 ${Date.now()}`;
  // 容量 4：接受两人后仍有余位，避免额外产生「行程已满员」类通知干扰计数。
  const trip = await createTripViaApi(a.page, publisher.id, title, {
    daysFromToday: 1,
    capacity: 4,
  });
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
  expect(snapshot.counts).toEqual({
    total: 3,
    by_type: typeCounts({ APPLICATION: 2, CHAT: 1 }),
  });
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
  const trip = await pairUp(a.page, publisher, companion, title, { daysFromToday: 1 });

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
  expect((await notificationsViaApi(a.page, publisher.id)).counts.by_type.CHAT).toBe(0);
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
  const trip = await pairUp(page, publisher, companion, title, { daysFromToday: 1 });
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

test('[N1] the notification centre groups eight types, filters with numbers and marks all read', async ({
  browser,
}) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, companion] = await createAccounts(a.page, '发布者', '同行');
  const title = `E2E 通知中心 ${Date.now()}`;
  const trip = await pairUp(a.page, publisher, companion, title, { daysFromToday: 1 });
  await sendMessageViaApi(b.page, companion.id, trip.id, publisher.id, '通知中心里的消息');

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveText('2', { timeout: 3000 });
  await expect(a.page.getByTestId('rail-notification-badge')).toHaveText('2');

  // 账号菜单与左下角账号按钮同口径：入口也带数字徽标。
  await a.page.getByRole('button', { name: `账号：${publisher.nickname}` }).click();
  await expect(a.page.getByTestId('account-notification-badge')).toHaveText('2');
  await a.page.keyboard.press('Escape');
  await expect(a.page.getByTestId('account-notification-badge')).toBeHidden();

  await a.page.goto('/#/notifications');
  await expect(a.page.getByTestId('notification-center')).toBeVisible();
  for (const type of [
    'TRIP',
    'APPLICATION',
    'CHAT',
    'CREDIT',
    'REPORT',
    'ACCOUNT',
    'SERVICE',
    'SYSTEM',
  ]) {
    await expect(a.page.getByTestId(`notification-filter-${type}`)).toBeVisible();
  }
  const filterCount = (type: string) =>
    a.page.getByTestId(`notification-filter-${type}`).locator('.notification-filter-count');

  await expect(filterCount('ALL')).toHaveText('2');
  await expect(filterCount('APPLICATION')).toHaveText('1');
  await expect(filterCount('CHAT')).toHaveText('1');
  await expect(filterCount('CREDIT')).toHaveText('0');

  await a.page.getByTestId('notification-filter-CHAT').click();
  await expect(a.page.getByTestId('notification-center-item')).toHaveCount(1);
  await expect(a.page.getByTestId('notification-center-item')).toContainText('新的同行消息');
  await expect(a.page.getByTestId('notification-center-item')).toContainText(
    '「' + companion.nickname + '」发来一条消息',
  );

  await a.page.getByTestId('notification-filter-APPLICATION').click();
  await expect(a.page.getByTestId('notification-center-item')).toHaveCount(1);
  await expect(a.page.getByTestId('notification-center-item')).toContainText('新的同行申请');

  await a.page.getByTestId('notification-filter-CREDIT').click();
  await expect(a.page.getByTestId('notification-center-empty')).toContainText('暂无信用分通知');
  await a.page.getByTestId('notification-filter-ALL').click();

  await a.page.getByTestId('notification-center-mark-all').click();
  await expect(a.page.getByTestId('notification-badge')).toHaveCount(0);
  await expect(a.page.getByTestId('rail-notification-badge')).toHaveCount(0);
  await expect(filterCount('ALL')).toHaveText('0');
  await expect(a.page.getByTestId('notification-center-item')).toHaveCount(2);
  await expect(a.page.locator('[data-testid="notification-center-item"][data-status="UNREAD"]'))
    .toHaveCount(0);

  const after = await notificationsViaApi(a.page, publisher.id);
  expect(after.counts).toEqual({ total: 0, by_type: typeCounts() });
  // 业务对象仍在：标读不删除通知，也不回滚行程或申请。
  const detail = await a.page.request.get(`${API}/trips/${trip.id}`, {
    headers: { 'X-User-Id': String(publisher.id) },
  });
  expect(detail.ok()).toBeTruthy();
});

test('[N2] type-specific notifications jump to their target pages', async ({ browser }) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, companion] = await createAccounts(a.page, '发布者', '同行');
  const title = `E2E 跳转 ${Date.now()}`;
  // 容量 2：接受唯一一名同行者即满员。满员通知发给同行者（发布者是接受动作的本人，
  // 自事件不通知）；同行者因此同时有「申请已通过」与「行程已满员」两类。
  const trip = await createTripViaApi(a.page, publisher.id, title, {
    daysFromToday: 1,
    capacity: 2,
  });
  await applyViaApi(b.page, companion.id, trip.id);
  await acceptApplicationViaApi(a.page, publisher.id, trip.id, companion.id);

  await openShell(b.page, companion);
  await expect(b.page.getByTestId('notification-badge')).toHaveText('2', { timeout: 3000 });
  await b.page.goto('/#/notifications');

  await expect(
    b.page.getByTestId('notification-filter-TRIP').locator('.notification-filter-count'),
  ).toHaveText('1');
  await b.page.getByTestId('notification-filter-TRIP').click();
  const tripItem = b.page.getByTestId('notification-center-item');
  await expect(tripItem).toContainText('行程已满员');
  await tripItem.click();
  await expect(b.page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(b.page.getByText(title).first()).toBeVisible();

  // 举报提交后由「举报」类通知直达举报详情页。
  const submitted = await b.page.request.post(`${API}/reports`, {
    headers: { 'X-User-Id': String(companion.id), 'Content-Type': 'application/json' },
    data: { target_type: 'trip', target_id: trip.id, reason: 'other' },
  });
  expect(submitted.status()).toBe(201);
  const mine = await b.page.request.get(`${API}/reports/mine`, {
    headers: { 'X-User-Id': String(companion.id) },
  });
  expect(mine.ok()).toBeTruthy();
  const reports = (await mine.json()) as { id: number; code: string }[];
  const report = reports[0];
  expect(report).toBeTruthy();

  await b.page.getByTestId('notification-bell').click();
  await expect(b.page.getByTestId('notification-item').first()).toContainText('举报已提交', {
    timeout: 5000,
  });
  await b.page.goto('/#/notifications');
  await b.page.getByTestId('notification-filter-REPORT').click();
  const reportItem = b.page.getByTestId('notification-center-item');
  await expect(reportItem).toContainText(report!.code);
  await reportItem.click();
  await expect(b.page).toHaveURL(new RegExp(`#/reports/${report!.id}$`));
  await expect(b.page.getByTestId('report-detail')).toBeVisible();
  await expect(b.page.getByTestId('report-detail-status')).toHaveText('待处理');
});

test('[N3] an unavailable related object keeps the content and never navigates', async ({
  browser,
}) => {
  const a = await newSession(browser);
  const b = await newSession(browser);
  const [publisher, applicant] = await createAccounts(a.page, '发布者', '申请者');
  const title = `E2E 不可查看 ${Date.now()}`;
  const trip = await createTripViaApi(a.page, publisher.id, title, { daysFromToday: 1 });
  await applyViaApi(b.page, applicant.id, trip.id);

  // 关联对象已不可访问由后端 related_available=false 表达；E2E 直接改写列表响应，
  // 验证前端保留正文、提示不可查看且不跳转。
  await a.page.route('**/api/notifications', async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as { items: NotificationItem[] };
    const items = body.items.map((item, index) =>
      index === 0 ? { ...item, related_available: false } : item,
    );
    await route.fulfill({ response, json: { ...body, items } });
  });

  await openShell(a.page, publisher);
  await expect(a.page.getByTestId('notification-badge')).toHaveText('1', { timeout: 3000 });
  await openPanel(a.page);
  const item = a.page.getByTestId('notification-item').first();
  await expect(item).toContainText(`「${applicant.nickname}」申请加入「${title}」`);
  await expect(item).toContainText('相关内容当前不可查看');

  await item.click();
  await expect(a.page.locator('.ant-message-notice-title')).toContainText(
    '相关内容当前不可查看',
    { timeout: 3000 },
  );
  expect(a.page.url()).not.toContain(`#/trips/${trip.id}`);
  await expect(a.page.getByTestId('notification-badge')).toHaveCount(0);

  // 通知中心里同样保留正文、只提示不可查看。
  await closePanel(a.page);
  await a.page.goto('/#/notifications');
  await expect(a.page.getByTestId('notification-center-item')).toContainText(
    `「${applicant.nickname}」申请加入「${title}」`,
  );
  await a.page.getByTestId('notification-center-item').first().click();
  expect(a.page.url()).toContain('#/notifications');
});