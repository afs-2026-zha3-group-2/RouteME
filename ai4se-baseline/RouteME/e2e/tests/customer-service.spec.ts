import { expect, test, type Page } from '@playwright/test';
import {
  API,
  createUserViaApi,
  loginAsAccount,
  loginAsAdmin,
  type ApiAccount,
} from './support';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function adminToken(page: Page): Promise<string> {
  const response = await page.request.post(`${API}/auth/login`, {
    data: { username: 'admin', password: 'admin12345' },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { token: string }).token;
}

async function submitReport(
  page: Page,
  reporterId: number,
  targetId: number,
  reason: string,
  note: string,
): Promise<void> {
  const response = await page.request.post(`${API}/reports`, {
    headers: { 'X-User-Id': String(reporterId), 'Content-Type': 'application/json' },
    data: { target_type: 'user', target_id: targetId, reason, note },
  });
  expect(response.status()).toBe(201);
}

async function helpReports(page: Page, account: ApiAccount) {
  const response = await page.request.get(`${API}/help/reports`, {
    headers: bearer(account.token),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    items: { id: number; code: string; reason: string; status: string }[];
    total: number;
  };
}

async function reportIdByReason(
  page: Page,
  account: ApiAccount,
  reason: string,
): Promise<{ id: number; code: string }> {
  const reports = await helpReports(page, account);
  const found = reports.items.find((item) => item.reason === reason && item.status === 'PENDING');
  expect(found).toBeTruthy();
  return found!;
}

async function startReport(page: Page, token: string, reportId: number) {
  const response = await page.request.post(`${API}/admin/reports/${reportId}/start`, {
    headers: bearer(token),
  });
  expect(response.ok()).toBeTruthy();
}

async function resolveReport(
  page: Page,
  token: string,
  reportId: number,
  data: Record<string, unknown>,
) {
  const response = await page.request.post(`${API}/admin/reports/${reportId}/resolve`, {
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    data,
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('[C] customer service', () => {
  test('[C1] gives users a dedicated service entry and retires the help centre', async ({ page }) => {
    const reporter = await createUserViaApi(page, `举报状态_${Date.now()}`);
    const reported = await createUserViaApi(page, `举报对象_${Date.now()}`);
    const hiddenNote = '管理员处理备注不应出现在用户侧';

    await submitReport(page, reporter.id, reported.id, 'harassment', '骚扰举报');
    const pending = await reportIdByReason(page, reporter, 'harassment');

    const token = await adminToken(page);
    await startReport(page, token, pending.id);
    await resolveReport(page, token, pending.id, {
      outcome: 'RESOLVED',
      note: hiddenNote,
      action: 'KEEP',
    });
    const resolved = await helpReports(page, reporter);
    expect(resolved.items.find((item) => item.id === pending.id)?.status).toBe('RESOLVED');

    // 用户侧：只有「联系客服」，帮助与反馈已下线。
    await loginAsAccount(page, reporter);
    await expect(page.locator('.rail-link').filter({ hasText: '联系客服' })).toBeVisible();
    await expect(page.locator('.rail-link').filter({ hasText: '帮助与反馈' })).toHaveCount(0);

    await page.goto('/#/support');
    await expect(page.getByRole('heading', { name: '联系客服' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '我的举报' })).toHaveCount(0);
    await expect(page.getByText(hiddenNote)).toHaveCount(0);

    // 帮助与反馈已下线：旧深链对普通用户与管理员都落到不存在页。
    await page.goto('/#/help');
    await expect(page.getByRole('heading', { name: '行程不存在' })).toBeVisible();

    await loginAsAdmin(page);
    await expect(page.locator('.rail-link').filter({ hasText: '帮助与反馈' })).toHaveCount(0);
    await page.goto('/#/admin');
    await expect(page.locator('.admin-tab').filter({ hasText: '帮助与反馈' })).toHaveCount(0);
    await page.goto('/#/help');
    await expect(page.getByRole('heading', { name: '行程不存在' })).toBeVisible();
  });

  test('[C3] starts, reuses, chats in and reopens a service session', async ({ page }) => {
    const user = await createUserViaApi(page, `客服会话_${Date.now()}`);

    await loginAsAccount(page, user);
    await page.goto('/#/support');
    await page.getByRole('button', { name: '开始对话' }).click();
    await expect(page.locator('.help-chat-head')).toContainText('等待客服接入');

    const current = await page.request.get(`${API}/service/sessions/current`, {
      headers: bearer(user.token),
    });
    const first = (await current.json()) as { id: number; status: string };
    expect(first.status).toBe('WAITING');

    const duplicate = await page.request.post(`${API}/service/sessions`, {
      headers: bearer(user.token),
    });
    expect(duplicate.ok()).toBeTruthy();
    expect(((await duplicate.json()) as { id: number }).id).toBe(first.id);

    const token = await adminToken(page);
    const joined = await page.request.post(
      `${API}/admin/service/sessions/${first.id}/join`,
      { headers: bearer(token) },
    );
    expect(joined.ok()).toBeTruthy();
    await expect(page.locator('.help-chat-head')).toContainText('客服已接入', { timeout: 6000 });

    const composer = page.getByPlaceholder('描述你遇到的问题（500 字以内）');
    const send = page.getByRole('button', { name: /发\s*送/ });
    await expect(send).toBeDisabled();
    await expect(composer).toHaveAttribute('maxlength', '500');

    const userMessage = '我的举报一直没有结果';
    await composer.fill(userMessage);
    await send.click();
    await expect(page.locator('.help-chat .bubble').filter({ hasText: userMessage })).toBeVisible();

    const userMessages = await page.request.get(
      `${API}/service/sessions/${first.id}/messages`,
      { headers: bearer(user.token) },
    );
    expect(userMessages.ok()).toBeTruthy();
    expect(((await userMessages.json()) as { content: string }[]).some(
      (message) => message.content === userMessage,
    )).toBe(true);

    // 过长消息由服务端拒绝（前端 maxlength 已截断）。
    const tooLong = await page.request.post(`${API}/service/sessions/${first.id}/messages`, {
      headers: { ...bearer(user.token), 'Content-Type': 'application/json' },
      data: { content: 'x'.repeat(501) },
    });
    expect(tooLong.status()).toBe(400);

    // 伪造客服身份被忽略：sender_type 始终由服务端判定。
    const impersonation = await page.request.post(
      `${API}/service/sessions/${first.id}/messages`,
      {
        headers: { ...bearer(user.token), 'Content-Type': 'application/json' },
        data: { content: '我是客服', sender_role: 'ADMIN', sender_type: 'ADMIN', sender_id: 1000 },
      },
    );
    expect(impersonation.status()).toBe(201);
    expect(((await impersonation.json()) as { sender_type: string }).sender_type).toBe('USER');

    const adminReply = '已经帮你加急处理了';
    const adminSend = await page.request.post(
      `${API}/service/sessions/${first.id}/messages`,
      {
        headers: { ...bearer(token), 'Content-Type': 'application/json' },
        data: { content: adminReply },
      },
    );
    expect(adminSend.status()).toBe(201);
    await expect(
      page.locator('.help-chat .bubble').filter({ hasText: adminReply }),
    ).toBeVisible({ timeout: 6000 });

    // 客服会话与行程聊天隔离。
    const partners = await page.request.get(`${API}/me/chat-partners`, {
      headers: { 'X-User-Id': String(user.id) },
    });
    expect(partners.ok()).toBeTruthy();
    expect((await partners.json()) as unknown[]).toEqual([]);

    const closed = await page.request.post(`${API}/admin/service/sessions/${first.id}/close`, {
      headers: bearer(token),
    });
    expect(closed.status()).toBe(404);

    await page.getByRole('button', { name: '结束会话' }).click();
    // 昵称 / 其他按钮的可见文案也可能含「确认」，限定到 Popconfirm 内的确认按钮。
    await page.locator('.ant-popconfirm').getByRole('button', { name: /确\s*认/ }).click();
    await expect(page.locator('.help-chat-head')).toContainText('已结束', { timeout: 6000 });
    await expect(page.getByText('会话已结束，只能查看历史消息。')).toBeVisible();
    await expect(
      page.locator('.help-chat .bubble').filter({ hasText: userMessage }),
    ).toBeVisible();
    await expect(
      page.locator('.help-chat .bubble').filter({ hasText: adminReply }),
    ).toBeVisible();

    await page.getByRole('button', { name: '重新发起会话' }).click();
    await expect(page.locator('.help-chat-head')).toContainText('等待客服接入');
    const reopened = await page.request.get(`${API}/service/sessions/current`, {
      headers: bearer(user.token),
    });
    const second = (await reopened.json()) as { id: number; status: string };
    expect(second.status).toBe('WAITING');
    expect(second.id).not.toBe(first.id);

    // 历史会话仍可按 id 读取。
    const history = await page.request.get(`${API}/admin/service/sessions/${first.id}`, {
      headers: bearer(token),
    });
    expect(history.ok()).toBeTruthy();
    expect(((await history.json()) as { status: string }).status).toBe('CLOSED');
  });

  test('[C5] keeps the user chat and the admin board in sync end to end', async ({ browser }) => {
    // 双端同时在线：两个独立 context，避免共享 localStorage 里的身份。
    test.setTimeout(120_000);
    // config 已把 ROUTEME_E2E_BASE_URL 折算进 use.baseURL，这里直接复用。
    const baseURL = test.info().project.use.baseURL ?? 'http://localhost:5173';
    const userContext = await browser.newContext({ baseURL });
    const adminContext = await browser.newContext({ baseURL });
    const userPage = await userContext.newPage();
    const adminPage = await adminContext.newPage();

    try {
      const user = await createUserViaApi(userPage, `联动客服_${Date.now()}`);

      // 管理端先停在客服看板，等用户端随后发起会话。
      await loginAsAdmin(adminPage);
      await adminPage.goto('/#/admin/service');
      await expect(adminPage.getByRole('heading', { name: '客户服务' })).toBeVisible();

      // 1) 用户端 UI 发起会话并发第一条消息。
      await loginAsAccount(userPage, user);
      await userPage.goto('/#/support');
      await expect(userPage.getByRole('heading', { name: '联系客服' })).toBeVisible();
      await userPage.getByRole('button', { name: '开始对话' }).click();
      await expect(userPage.locator('.help-chat-head')).toContainText('等待客服接入');

      const userMessage = `想确认一下行程发布后多久能被审核 ${Date.now()}`;
      await userPage.getByPlaceholder('描述你遇到的问题（500 字以内）').fill(userMessage);
      await userPage.getByRole('button', { name: /发\s*送/ }).click();
      await expect(
        userPage.locator('.help-chat .bubble').filter({ hasText: userMessage }),
      ).toBeVisible();

      // 2) 看板联动：轮询把等待中的会话带进队列，无需手动刷新。
      await expect(adminPage.getByText('有会话正在等待接入')).toBeVisible({ timeout: 10_000 });
      const queueItem = adminPage.locator('.admin-queue-item').filter({ hasText: user.nickname });
      await expect(queueItem).toBeVisible({ timeout: 10_000 });
      await expect(queueItem).toContainText('等待接入');
      await expect(queueItem.locator('.admin-queue-count')).toContainText('1');

      // 3) 打开会话先看到用户消息与上下文，再从管理端 UI 接入并回复。
      await queueItem.click();
      await expect(
        adminPage.locator('.service-chat .bubble').filter({ hasText: userMessage }),
      ).toBeVisible();
      await expect(adminPage.getByText('用户资料').first()).toBeVisible();
      await adminPage.getByRole('button', { name: '接入会话' }).click();
      await expect(adminPage.getByText('处理中').first()).toBeVisible();

      const adminReply = '已收到，发布后 10 分钟内完成审核。';
      await adminPage.getByPlaceholder('输入回复（500 字以内）').fill(adminReply);
      await adminPage.getByRole('button', { name: /发\s*送/ }).click();
      await expect(
        adminPage.locator('.service-chat .bubble').filter({ hasText: adminReply }),
      ).toBeVisible();

      // 4) 用户端轮询：状态变为已接入，并出现客服回复。
      await expect(userPage.locator('.help-chat-head')).toContainText('客服已接入', {
        timeout: 8_000,
      });
      await expect(
        userPage.locator('.help-chat .bubble').filter({ hasText: adminReply }),
      ).toBeVisible({ timeout: 8_000 });

      // 5) 反向联动：用户追问后，管理端不刷新也能看到。
      const followUp = '好的，审核通过后会通知吗？';
      await userPage.getByPlaceholder('描述你遇到的问题（500 字以内）').fill(followUp);
      await userPage.getByRole('button', { name: /发\s*送/ }).click();
      await expect(
        adminPage.locator('.service-chat .bubble').filter({ hasText: followUp }),
      ).toBeVisible({ timeout: 8_000 });

      // 6) 管理端结束会话：已结束筛选仍可回查。
      // 不断言全局等待横幅归零：其他用例可能留着等待接入的会话。
      await adminPage.getByRole('button', { name: '结束会话' }).click();
      await adminPage.getByRole('button', { name: /确\s*认/ }).click();
      await expect(adminPage.getByText('会话已结束，只能查看历史消息。')).toBeVisible();
      await adminPage.getByRole('button', { name: '会话状态' }).click();
      await adminPage.getByRole('option', { name: '已结束' }).click();
      const closedItem = adminPage
        .locator('.admin-queue-item')
        .filter({ hasText: user.nickname });
      await expect(closedItem).toBeVisible();
      await expect(closedItem).toContainText('已结束');

      // 7) 用户端收到结束：输入区只读，历史消息保留，可重新发起。
      await expect(userPage.locator('.help-chat-head')).toContainText('已结束', {
        timeout: 8_000,
      });
      await expect(userPage.getByText('会话已结束，只能查看历史消息。')).toBeVisible({
        timeout: 8_000,
      });
      await expect(
        userPage.locator('.help-chat .bubble').filter({ hasText: userMessage }),
      ).toBeVisible();
      await expect(
        userPage.locator('.help-chat .bubble').filter({ hasText: adminReply }),
      ).toBeVisible();

      // 8) 重新发起后新会话再次进入看板等待队列；接入并关闭以清理现场。
      await userPage.getByRole('button', { name: '重新发起会话' }).click();
      await expect(userPage.locator('.help-chat-head')).toContainText('等待客服接入');

      await adminPage.getByRole('button', { name: '会话状态' }).click();
      await adminPage.getByRole('option', { name: '等待接入' }).click();
      const reopenedItem = adminPage
        .locator('.admin-queue-item')
        .filter({ hasText: user.nickname });
      await expect(reopenedItem).toBeVisible({ timeout: 10_000 });
      await expect(reopenedItem).toContainText('等待接入');
      await reopenedItem.first().click();
      await adminPage.getByRole('button', { name: '接入会话' }).click();
      await expect(adminPage.getByText('处理中').first()).toBeVisible();
      await adminPage.getByRole('button', { name: '结束会话' }).click();
      await adminPage.getByRole('button', { name: /确\s*认/ }).click();
      await expect(adminPage.getByText('会话已结束，只能查看历史消息。')).toBeVisible();
    } finally {
      await userContext.close();
      await adminContext.close();
    }
  });

  test('[C4] marks a session resolved and lets the user close it', async ({ page }) => {
    const user = await createUserViaApi(page, `客服待确认_${Date.now()}`);

    await loginAsAccount(page, user);
    await page.goto('/#/support');
    await page.getByRole('button', { name: '开始对话' }).click();
    await expect(page.locator('.help-chat-head')).toContainText('等待客服接入');

    const current = await page.request.get(`${API}/service/sessions/current`, {
      headers: bearer(user.token),
    });
    const session = (await current.json()) as { id: number; status: string };

    const token = await adminToken(page);
    const joined = await page.request.post(
      `${API}/admin/service/sessions/${session.id}/join`,
      { headers: bearer(token) },
    );
    expect(joined.ok()).toBeTruthy();
    const resolved = await page.request.post(
      `${API}/admin/service/sessions/${session.id}/resolve`,
      { headers: bearer(token) },
    );
    expect(resolved.ok()).toBeTruthy();

    await expect(page.locator('.help-chat-head')).toContainText('待用户确认', { timeout: 6000 });
    // 同一句提示同时出现在卡片头部与聊天头部，限定到聊天头部避免 strict mode。
    await expect(
      page.locator('.help-chat-head').getByText('客服已标记处理完成，如问题已解决请结束会话。'),
    ).toBeVisible();

    // 用户继续发言 → 回到处理中，resolved_* 清空。
    const composer = page.getByPlaceholder('描述你遇到的问题（500 字以内）');
    await composer.fill('问题还没解决');
    await page.getByRole('button', { name: /发\s*送/ }).click();
    await expect(page.locator('.help-chat-head')).toContainText('客服已接入', { timeout: 6000 });

    const stillResolved = await page.request.get(`${API}/service/sessions/${session.id}/messages`, {
      headers: bearer(user.token),
    });
    expect(stillResolved.ok()).toBeTruthy();

    const resolvedAgain = await page.request.post(
      `${API}/admin/service/sessions/${session.id}/resolve`,
      { headers: bearer(token) },
    );
    expect(resolvedAgain.ok()).toBeTruthy();
    await expect(page.locator('.help-chat-head')).toContainText('待用户确认', { timeout: 6000 });

    await page.getByRole('button', { name: '结束会话' }).click();
    // 昵称 / 其他按钮的可见文案也可能含「确认」，限定到 Popconfirm 内的确认按钮。
    await page.locator('.ant-popconfirm').getByRole('button', { name: /确\s*认/ }).click();
    await expect(page.locator('.help-chat-head')).toContainText('已结束', { timeout: 6000 });

    const detail = await page.request.get(`${API}/admin/service/sessions/${session.id}`, {
      headers: bearer(token),
    });
    const body = (await detail.json()) as {
      status: string;
      resolved_at?: string;
      messages: { content: string }[];
    };
    expect(body.status).toBe('CLOSED');
    expect(body.resolved_at).toBeTruthy();
    expect(body.messages.some((message) => message.content === '问题还没解决')).toBe(true);
  });
});
