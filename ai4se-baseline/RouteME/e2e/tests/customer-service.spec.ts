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

test.describe('[C] help centre and customer service', () => {
  test('[C1] keeps the help centre for admins only and gives users a dedicated service entry', async ({ page }) => {
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

    // 用户侧：只有「联系客服」，不再有「帮助与反馈」。
    await loginAsAccount(page, reporter);
    await expect(page.locator('.rail-link').filter({ hasText: '联系客服' })).toBeVisible();
    await expect(page.locator('.rail-link').filter({ hasText: '帮助与反馈' })).toHaveCount(0);

    await page.goto('/#/support');
    await expect(page.getByRole('heading', { name: '联系客服' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '我的举报' })).toHaveCount(0);
    await expect(page.getByText(hiddenNote)).toHaveCount(0);

    // 深链也拦住：非管理员打开 #/help 只能看到权限提示。
    await page.goto('/#/help');
    await expect(page.getByText('该页面仅对管理员开放。')).toBeVisible();

    // 管理员保留帮助与反馈（含举报进度）。
    await loginAsAdmin(page);
    await page.goto('/#/help');
    await expect(page.getByRole('heading', { name: '帮助与反馈' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '我的举报' })).toBeVisible();
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

    const closed = await page.request.post(
      `${API}/admin/service/sessions/${first.id}/close`,
      { headers: bearer(token) },
    );
    expect(closed.ok()).toBeTruthy();
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
});