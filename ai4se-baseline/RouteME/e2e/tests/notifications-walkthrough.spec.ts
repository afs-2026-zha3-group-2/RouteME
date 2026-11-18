import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  API,
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
  createUserViaApi,
  type ApiAccount,
} from './support';

/**
 * 通知走查证据（atdd V1–V4，浅色唯一主题）：
 * - V1：1440 / 768 / 390 三档宽度，铃铛徽标 + 面板 + 未读文字可读、无横向溢出；
 * - V2：面板打开时新事件只更新列表，不移动焦点；Escape 关闭并把焦点还给铃铛；
 * - V3：推送通道中断时计数保留、无阻塞弹窗；恢复后对账不重复（用路由中断模拟断线）；
 * - V4：同一用户两个标签页各自一条 emitter，收到同一事件且计数一致。
 * 截图写入 `ai4se-baseline/docs/preview/notifications-<宽>-light.png`（共 3 张）。
 */

const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1000 },
  { width: 390, height: 844 },
];

type Seeded = { publisher: ApiAccount; companion: ApiAccount; tripId: number };

/** 发布者收到 1 条申请 + 1 条消息（申请类 1、聊天类 1、总数 2）。 */
async function seed(page: Page, label: string): Promise<Seeded> {
  const stamp = Date.now().toString().slice(-6);
  const publisher = await createUserViaApi(page, `发布者${label}${stamp}`);
  const companion = await createUserViaApi(page, `同行${label}${stamp}`);
  const trip = await createTripViaApi(page, publisher.id, `走查行程${label}${stamp}`, {
    daysFromToday: 1,
  });
  await applyViaApi(page, companion.id, trip.id);
  await acceptApplicationViaApi(page, publisher.id, trip.id, companion.id);
  const sent = await page.request.post(`${API}/trips/${trip.id}/messages`, {
    headers: { 'X-User-Id': String(companion.id), 'Content-Type': 'application/json' },
    data: { receiver_id: publisher.id, content: '走查用消息' },
  });
  expect(sent.status()).toBe(201);
  return { publisher, companion, tripId: trip.id };
}

async function openAs(page: Page, account: ApiAccount): Promise<void> {
  await page.addInitScript(
    ({ id, token }) => {
      window.localStorage.setItem('routeme.currentUserId', String(id));
      window.localStorage.setItem('routeme.authToken', token);
    },
    { id: account.id, token: account.token },
  );
  await page.goto('/#/');
  await expect(page.getByTestId('notification-bell')).toBeVisible();
}

test('[V1] 1440 / 768 / 390 浅色：徽标、面板、未读文字可读且不溢出', async ({ browser }) => {
  test.setTimeout(240_000);
  const seeder = await browser.newContext();
  const seeded = await seed(await seeder.newPage(), 'V1');
  await seeder.close();

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await openAs(page, seeded.publisher);

    await expect(page.getByTestId('notification-badge')).toHaveText('2', { timeout: 5000 });
    await expect(page.getByTestId('rail-chat-badge')).toHaveText('1');
    await page.getByTestId('notification-bell').click();
    const panel = page.getByTestId('notification-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('notification-item')).toHaveCount(2);
    // 未读不只靠颜色：条目里有一行「未读」文字。
    await expect(panel.getByText('未读').first()).toBeVisible();
    await expect(panel.getByText('查看全部通知')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.width}px 无横向溢出`).toBeLessThanOrEqual(1);

    // 面板本体也必须完整落在视口内：390px 下曾被弹层内边距顶出屏幕左侧。
    // 弹层有入场动画（起始 scale 0、盒子 0 宽），所以轮询到盒子展开后再断言边界。
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
          if (box.x + box.width > viewport.width + 1) {
            return `right:${Math.round(box.x + box.width)}`;
          }
          return 'inside';
        },
        { message: `${viewport.width}px 面板完整落在视口内`, timeout: 5000 },
      )
      .toBe('inside');

    await page.screenshot({
      path: path.join(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'docs',
        'preview',
        `notifications-${viewport.width}-light.png`,
      ),
      fullPage: false,
    });
    await context.close();
  }
});

test('[V2] 面板开着时新事件不抢焦点，Escape 关闭并交还焦点', async ({ browser }) => {
  const seeder = await browser.newContext();
  const seeded = await seed(await seeder.newPage(), 'V2');
  await seeder.close();

  const context = await browser.newContext();
  const page = await context.newPage();
  await openAs(page, seeded.publisher);
  await expect(page.getByTestId('notification-badge')).toHaveText('2', { timeout: 5000 });

  await page.getByTestId('notification-bell').click();
  const panel = page.getByTestId('notification-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('notification-bell')).toBeFocused();

  const sent = await page.request.post(`${API}/trips/${seeded.tripId}/messages`, {
    headers: { 'X-User-Id': String(seeded.companion.id), 'Content-Type': 'application/json' },
    data: { receiver_id: seeded.publisher.id, content: '面板打开时到达' },
  });
  expect(sent.status()).toBe(201);

  await expect(page.getByTestId('notification-badge')).toHaveText('3', { timeout: 5000 });
  await expect(panel.getByTestId('notification-item')).toHaveCount(3);
  // 焦点仍在铃铛上，列表更新没有把焦点抢走。
  await expect(page.getByTestId('notification-bell')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByTestId('notification-bell')).toBeFocused();
  await context.close();
});

test('[V3] 通道中断时保留计数，恢复后对账不重复', async ({ browser }) => {
  const seeder = await browser.newContext();
  const seeded = await seed(await seeder.newPage(), 'V3');
  await seeder.close();

  const context = await browser.newContext();
  const page = await context.newPage();
  await openAs(page, seeded.publisher);
  await expect(page.getByTestId('notification-badge')).toHaveText('2', { timeout: 5000 });

  // 断开推送与对账请求，模拟后端不可达（比 offline 更精准，不影响 Vite 资源）。
  await page.route('**/api/notifications**', (route) => route.abort());
  await page.waitForTimeout(4000);

  await expect(page.getByTestId('notification-badge')).toHaveText('2');
  await expect(page.locator('.ant-modal')).toHaveCount(0);
  await expect(page.locator('.ant-message-error')).toHaveCount(0);

  // 恢复可达后，重连触发的快照对账只合并、不重复。
  await page.unroute('**/api/notifications**');
  await page.getByTestId('notification-bell').click();
  const panel = page.getByTestId('notification-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('notification-item')).toHaveCount(2, { timeout: 15_000 });
  await expect(page.getByTestId('notification-badge')).toHaveText('2');
  await context.close();
});

test('[V4] 两个标签页同一用户：都收到事件且计数一致', async ({ browser }) => {
  const seeder = await browser.newContext();
  const seeded = await seed(await seeder.newPage(), 'V4');
  await seeder.close();

  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await openAs(first, seeded.publisher);
  await second.goto('/#/mine');
  await expect(first.getByTestId('notification-badge')).toHaveText('2', { timeout: 5000 });
  await expect(second.getByTestId('notification-badge')).toHaveText('2', { timeout: 5000 });

  const sent = await first.request.post(`${API}/trips/${seeded.tripId}/messages`, {
    headers: { 'X-User-Id': String(seeded.companion.id), 'Content-Type': 'application/json' },
    data: { receiver_id: seeded.publisher.id, content: '两个标签页都要收到' },
  });
  expect(sent.status()).toBe(201);

  await expect(first.getByTestId('notification-badge')).toHaveText('3', { timeout: 5000 });
  await expect(second.getByTestId('notification-badge')).toHaveText('3', { timeout: 5000 });
  await expect(first.getByTestId('rail-chat-badge')).toHaveText('2');
  await expect(second.getByTestId('rail-chat-badge')).toHaveText('2');
  await context.close();
});