import { expect, test, type Page } from '@playwright/test';
import {
  API,
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
  createUserViaApi,
  loginAsAccount,
  loginAsAdmin,
  setUserStatusViaApi,
} from './support';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const writeHeaders = (userId: number) => ({
  'X-User-Id': String(userId),
  'Content-Type': 'application/json',
});

async function adminUserDetail(page: Page, token: string, userId: number) {
  const response = await page.request.get(`${API}/admin/users/${userId}`, {
    headers: bearer(token),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    status: string;
    trip_total: number;
    experience_total: number;
    report_total: number;
    ban_expires_at?: string | null;
    ban_reason_code?: string | null;
    ban_reason_note?: string | null;
  };
}

async function chatCount(page: Page, userId: number, tripId: number, withUserId: number) {
  const response = await page.request.get(
    `${API}/trips/${tripId}/messages?with=${withUserId}`,
    { headers: { 'X-User-Id': String(userId) } },
  );
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as unknown[]).length;
}

/** 通过 Bearer 找到刚提交的举报（POST /reports 只返回 received）。 */
async function findReportId(
  page: Page,
  token: string,
  predicate: (item: { target_id: number; reason: string; status: string }) => boolean,
): Promise<{ id: number; code: string; status: string }> {
  const response = await page.request.get(`${API}/help/reports`, {
    headers: bearer(token),
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    items: { id: number; code: string; target_id: number; reason: string; status: string }[];
  };
  const found = body.items.find(predicate);
  expect(found).toBeTruthy();
  return found!;
}

async function openUserDetail(page: Page, userId: number) {
  await page.goto(`/#/admin/users/${userId}`);
  await expect(page.getByRole('heading', { name: '用户详情' })).toBeVisible();
}

/** 造一个被处罚用户，并让它拥有行程 / 体验 / 消息 / 举报各一份。 */
async function prepareActiveUser(page: Page) {
  const publisher = await createUserViaApi(page, `发布者_${Date.now()}`);
  const victim = await createUserViaApi(page, `被处罚_${Date.now()}`);
  const victimTrip = await createTripViaApi(page, victim.id, `受害行程_${Date.now()}`);
  const publisherTrip = await createTripViaApi(page, publisher.id, `同行行程_${Date.now()}`);
  await applyViaApi(page, victim.id, publisherTrip.id, '一起走吧');
  await acceptApplicationViaApi(page, publisher.id, publisherTrip.id, victim.id);

  const chat = await page.request.post(`${API}/trips/${publisherTrip.id}/messages`, {
    headers: writeHeaders(victim.id),
    data: { receiver_id: publisher.id, content: '出发前的问候' },
  });
  expect(chat.status()).toBe(201);

  const completed = await page.request.post(`${API}/trips/${publisherTrip.id}/complete`, {
    headers: { 'X-User-Id': String(publisher.id) },
  });
  expect(completed.ok()).toBeTruthy();

  const experience = await page.request.post(`${API}/trips/${publisherTrip.id}/experiences`, {
    headers: writeHeaders(victim.id),
    data: {
      content: '这次同行很顺利，路线安排清晰，集合时间也准时，整体体验不错。',
      intensity: 'relaxed',
      advice: '记得带防晒',
    },
  });
  expect(experience.status()).toBe(201);

  const report = await page.request.post(`${API}/reports`, {
    headers: writeHeaders(victim.id),
    data: {
      target_type: 'user',
      target_id: publisher.id,
      reason: 'other',
      note: '测试前留下的举报',
    },
  });
  expect(report.status()).toBe(201);

  return { publisher, victim, victimTrip, publisherTrip };
}

test.describe('[I1] admin console access and user management', () => {
  test('[I1] guards direct links, searches users and pages the list', async ({ page }) => {
    const outsider = await createUserViaApi(page, `越权用户_${Date.now()}`);

    await loginAsAccount(page, outsider);
    await page.goto('/#/admin/users');
    await expect(page.getByText('没有访问权限')).toBeVisible();
    await expect(page.locator('.admin-table-wrap')).toHaveCount(0);

    const denied = await page.request.get(`${API}/admin/users`, {
      headers: bearer(outsider.token),
    });
    expect(denied.status()).toBe(403);
    expect(((await denied.json()) as { code: string }).code).toBe('ADMIN_REQUIRED');

    await loginAsAdmin(page);
    await expect(page.getByRole('link', { name: '管理后台' }).first()).toBeVisible();
    await page.getByRole('link', { name: '管理后台' }).first().click();
    await expect(page).toHaveURL(/#\/admin\/users/);
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

    await page.getByPlaceholder('搜索用户 ID、昵称或邮箱').fill(outsider.nickname);
    await page.getByRole('button', { name: /搜\s*索/ }).click();
    const row = page.locator('.admin-table-wrap tbody tr').filter({ hasText: outsider.nickname });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('未填写');

    await row.getByRole('link', { name: '查看详情' }).click();
    await expect(page.getByRole('heading', { name: '用户详情' })).toBeVisible();
    await expect(page.locator('.admin-detail-meta')).toContainText(`ID ${outsider.id}`);
    await expect(page.getByRole('heading', { name: /相关举报/ })).toBeVisible();

    // 分页：补足 15 条以上，占用两次翻页确认列表确实换页（不依赖全表条数）。
    for (let index = 0; index < 12; index += 1) {
      await createUserViaApi(page, `分页${Date.now().toString().slice(-6)}${index}`);
    }
    await page.goto('/#/admin/users');
    await expect(page.getByText(/^共 \d+ 条$/)).toBeVisible();
    const firstPageFirstRow = await page
      .locator('.admin-table-wrap tbody tr')
      .first()
      .getAttribute('data-row-key');
    expect(firstPageFirstRow).toBeTruthy();
    await page.getByRole('button', { name: '第 2 页' }).click();
    await expect(page.locator('.admin-table-wrap tbody tr').first()).not.toHaveAttribute(
      'data-row-key',
      firstPageFirstRow!,
    );
    await page.getByRole('button', { name: '上一页' }).click();
    await expect(page.locator('.admin-table-wrap tbody tr').first()).toHaveAttribute(
      'data-row-key',
      firstPageFirstRow!,
    );
  });

  test('[I1] suspends a user, blocks four writes and keeps data counts', async ({ page }) => {
    const { publisher, victim, publisherTrip } = await prepareActiveUser(page);
    const admin = await loginAsAdmin(page);

    const before = await adminUserDetail(page, admin.token, victim.id);
    const beforeMessages = await chatCount(page, victim.id, publisherTrip.id, publisher.id);
    expect(before.trip_total).toBe(1);
    expect(before.experience_total).toBe(1);
    expect(before.report_total).toBe(1);

    const selfPunish = await setUserStatusViaApi(page, admin.token, admin.id, {
      action: 'SUSPEND',
      reason: '自罚测试',
    });
    expect(selfPunish.status()).toBe(409);
    expect(((await selfPunish.json()) as { code: string }).code).toBe('CANNOT_TARGET_SELF');

    const restoreActive = await setUserStatusViaApi(page, admin.token, victim.id, {
      action: 'RESTORE',
    });
    expect(restoreActive.status()).toBe(409);
    expect(((await restoreActive.json()) as { code: string }).code).toBe(
      'INVALID_STATUS_TRANSITION',
    );

    await openUserDetail(page, victim.id);
    await page.getByRole('button', { name: '暂停账号' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('处理原因').fill('E2E：暂停测试');
    await modal.getByRole('button', { name: '确认执行' }).click();
    await expect(page.locator('.admin-detail-hero').getByText('已暂停')).toBeVisible();

    const tripWrite = await page.request.post(`${API}/trips`, {
      headers: writeHeaders(victim.id),
      data: {
        title: `暂停后行程_${Date.now()}`,
        destination_code: '440400',
        start_date: '2027-05-01',
        end_date: '2027-05-02',
        stops: ['集合点'],
        tags: ['摄影'],
        capacity: 2,
      },
    });
    expect(tripWrite.status()).toBe(403);
    expect(((await tripWrite.json()) as { code: string }).code).toBe('ACCOUNT_SUSPENDED');

    const applyWrite = await page.request.post(
      `${API}/trips/${publisherTrip.id}/applications`,
      { headers: writeHeaders(victim.id), data: { message: '还能加入吗' } },
    );
    expect(applyWrite.status()).toBe(403);
    expect(((await applyWrite.json()) as { code: string }).code).toBe('ACCOUNT_SUSPENDED');

    const chatWrite = await page.request.post(`${API}/trips/${publisherTrip.id}/messages`, {
      headers: writeHeaders(victim.id),
      data: { receiver_id: publisher.id, content: '暂停后的消息' },
    });
    expect(chatWrite.status()).toBe(403);
    expect(((await chatWrite.json()) as { code: string }).code).toBe('ACCOUNT_SUSPENDED');

    const experienceWrite = await page.request.post(
      `${API}/trips/${publisherTrip.id}/experiences`,
      {
        headers: writeHeaders(victim.id),
        data: { content: '暂停后的体验内容，应该被拒绝。', intensity: 'relaxed', advice: '别试了' },
      },
    );
    expect(experienceWrite.status()).toBe(403);
    expect(((await experienceWrite.json()) as { code: string }).code).toBe('ACCOUNT_SUSPENDED');

    // 读接口仍可用，且四类计数未因处罚减少。
    const afterMessages = await chatCount(page, victim.id, publisherTrip.id, publisher.id);
    expect(afterMessages).toBe(beforeMessages);
    const after = await adminUserDetail(page, admin.token, victim.id);
    expect(after.status).toBe('SUSPENDED');
    expect(after.trip_total).toBe(before.trip_total);
    expect(after.experience_total).toBe(before.experience_total);
    expect(after.report_total).toBe(before.report_total);

    // 资料页暂停提示：暂停期间展示，恢复后消失（A20 / A21）。
    await loginAsAccount(page, victim);
    // A41：受限用户登录后无需打开资料页即可看到暂停说明。
    await expect(page.locator('.view-status-notice')).toContainText('账号已被暂停');
    await page.goto(`/#/users/${victim.id}`);
    await expect(page.getByText('账号已被暂停')).toBeVisible();

    const restored = await setUserStatusViaApi(page, admin.token, victim.id, { action: 'RESTORE' });
    expect(restored.ok()).toBeTruthy();
    const restoredDetail = await adminUserDetail(page, admin.token, victim.id);
    expect(restoredDetail.status).toBe('ACTIVE');
    expect(restoredDetail.ban_expires_at ?? null).toBeNull();

    await page.reload();
    await expect(page.getByText('账号已被暂停')).toHaveCount(0);

    const tripAfterRestore = await createTripViaApi(page, victim.id, `恢复后行程_${Date.now()}`);
    expect(tripAfterRestore.id).toBeGreaterThan(0);
  });

  test('[I1] bans a user and shows the ban notice on the profile page', async ({ page }) => {
    const { victim } = await prepareActiveUser(page);
    const admin = await loginAsAdmin(page);

    await openUserDetail(page, victim.id);
    await page.getByRole('button', { name: '封禁账号' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('处理原因').fill('E2E：封禁测试');
    await modal.getByRole('button', { name: '封禁理由' }).click();
    await modal.getByRole('option', { name: '骚扰或不当言行' }).click();
    const expires = modal.locator('#status-ban-expires');
    await expires.fill('2035-01-01 12:00');
    await expires.press('Enter');
    await modal.getByRole('button', { name: '确认执行' }).click();

    await expect(page.locator('.admin-detail-hero').getByText('已封禁')).toBeVisible();
    await expect(page.getByText('骚扰或不当言行')).toBeVisible();
    await expect(page.getByText('2035-01-01 12:00')).toBeVisible();

    const bannedSuspend = await setUserStatusViaApi(page, admin.token, victim.id, {
      action: 'SUSPEND',
      reason: '非法迁移',
    });
    expect(bannedSuspend.status()).toBe(409);
    expect(((await bannedSuspend.json()) as { code: string }).code).toBe(
      'INVALID_STATUS_TRANSITION',
    );

    // BANNED 只能通过举报处置更新封禁，本端点不可恢复。
    const bannedRestore = await setUserStatusViaApi(page, admin.token, victim.id, {
      action: 'RESTORE',
    });
    expect(bannedRestore.status()).toBe(409);
    expect(((await bannedRestore.json()) as { code: string }).code).toBe(
      'INVALID_STATUS_TRANSITION',
    );

    const bannedTrip = await page.request.post(`${API}/trips`, {
      headers: writeHeaders(victim.id),
      data: {
        title: `封禁后行程_${Date.now()}`,
        destination_code: '440400',
        start_date: '2027-06-01',
        end_date: '2027-06-02',
        stops: ['集合点'],
        tags: ['摄影'],
        capacity: 2,
      },
    });
    expect(bannedTrip.status()).toBe(403);
    expect(((await bannedTrip.json()) as { code: string }).code).toBe('ACCOUNT_BANNED');

    const bannedReport = await page.request.post(`${API}/reports`, {
      headers: writeHeaders(victim.id),
      data: { target_type: 'user', target_id: 1, reason: 'other', note: '封禁后的举报' },
    });
    expect(bannedReport.status()).toBe(403);
    expect(((await bannedReport.json()) as { code: string }).code).toBe('ACCOUNT_BANNED');

    const bannedSession = await page.request.post(`${API}/service/sessions`, {
      headers: bearer(victim.token),
    });
    expect(bannedSession.status()).toBe(403);
    expect(((await bannedSession.json()) as { code: string }).code).toBe('ACCOUNT_BANNED');

    await loginAsAccount(page, victim);
    // A41：登录后首页顶部即出现封禁理由与解封时间。
    await expect(page.locator('.view-status-notice')).toContainText('账号已被封禁');
    await expect(page.locator('.view-status-notice')).toContainText('骚扰或不当言行');
    await expect(page.locator('.view-status-notice')).toContainText('2035-01-01 12:00');
    await page.goto(`/#/users/${victim.id}`);
    await expect(page.getByText('账号已被封禁')).toBeVisible();
    await expect(page.getByText('骚扰或不当言行', { exact: false })).toBeVisible();
    await expect(page.getByText('2035-01-01 12:00')).toBeVisible();
    // 处理原因与补充说明只留在后台，不进入用户侧资料页响应。
    await expect(page.getByText('E2E：封禁测试')).toHaveCount(0);

    const publicProfile = await page.request.get(`${API}/users/${victim.id}/profile`, {
      headers: { 'X-User-Id': String(victim.id) },
    });
    expect(publicProfile.ok()).toBeTruthy();
    const profileBody = (await publicProfile.json()) as Record<string, unknown>;
    expect(profileBody.status).toBe('BANNED');
    expect(profileBody.ban_reason_code).toBe('HARASSMENT');
    expect(profileBody.ban_expires_at).toBeTruthy();
    expect(profileBody.status_reason ?? null).toBeNull();
    expect(profileBody.ban_reason_note ?? null).toBeNull();
  });
});

test.describe('[I2] report queue and resolution', () => {
  test('[I2] processes reports and keeps reporter-visible status private', async ({ page }) => {
    const reporter = await createUserViaApi(page, `举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `被举报人_${Date.now()}`);
    const trip = await createTripViaApi(page, reported.id, `被举报行程_${Date.now()}`);
    const note = 'E2E 举报备注：行程描述与实际情况不符';
    const resolutionNote = 'E2E 处理备注：已核实并暂停账号';

    const submitted = await page.request.post(`${API}/reports`, {
      headers: writeHeaders(reporter.id),
      data: { target_type: 'trip', target_id: trip.id, reason: 'fake', note },
    });
    expect(submitted.status()).toBe(201);
    const created = await findReportId(
      page,
      reporter.token,
      (item) => item.target_id === trip.id && item.reason === 'fake',
    );

    const admin = await loginAsAdmin(page);
    await page.goto('/#/admin/reports');
    await page.getByRole('button', { name: '举报状态' }).click();
    await page.getByRole('option', { name: '待处理' }).click();
    const reportRow = page
      .locator('.admin-table-wrap tbody tr')
      .filter({ hasText: created.code });
    await expect(reportRow).toHaveCount(1);

    await reportRow.getByRole('link', { name: '查看详情' }).click();
    await expect(page.getByRole('heading', { name: '举报详情' })).toBeVisible();
    await expect(page.getByText('举报上下文')).toBeVisible();
    await expect(page.getByText(reporter.nickname).first()).toBeVisible();
    await expect(page.getByText(reported.nickname).first()).toBeVisible();
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.locator('.admin-excerpt').first()).toContainText(trip.title);

    await page.getByRole('button', { name: '开始处理' }).click();
    await expect(page.locator('.admin-detail-hero').getByText('处理中')).toBeVisible();

    const duplicate = await page.request.post(`${API}/admin/reports/${created.id}/start`, {
      headers: bearer(admin.token),
    });
    expect(duplicate.status()).toBe(409);
    expect(((await duplicate.json()) as { code: string }).code).toBe('REPORT_NOT_PENDING');

    await page.getByLabel('举报成立').check();
    await page.getByRole('button', { name: '处罚动作' }).click();
    await page.getByRole('option', { name: '暂停账号' }).click();
    await page.getByRole('button', { name: '提交处理' }).click();
    await expect(page.getByText('必填，500 字以内')).toBeVisible();

    await page.getByLabel('处理备注').fill(resolutionNote);
    await page.getByRole('button', { name: '提交处理' }).click();
    await expect(page.locator('.admin-detail-hero').getByText('已处理')).toBeVisible();

    const reportedDetail = await adminUserDetail(page, admin.token, reported.id);
    expect(reportedDetail.status).toBe('SUSPENDED');

    await loginAsAccount(page, reporter);
    await page.goto('/#/help');
    const reportItem = page.locator('.help-report').filter({ hasText: created.code });
    await expect(reportItem).toContainText('已处理');
    await expect(reportItem).toContainText('虚假信息');
    await expect(page.getByText(resolutionNote)).toHaveCount(0);

    // 已受限用户：另一条举报走「维持暂停」，状态保持不变。
    const second = await page.request.post(`${API}/reports`, {
      headers: writeHeaders(reporter.id),
      data: { target_type: 'user', target_id: reported.id, reason: 'safety', note: '安全问题' },
    });
    expect(second.status()).toBe(201);
    const secondReport = await findReportId(
      page,
      reporter.token,
      (item) => item.target_id === reported.id && item.reason === 'safety',
    );

    await loginAsAdmin(page);
    await page.goto(`/#/admin/reports/${secondReport.id}`);
    await page.getByRole('button', { name: '开始处理' }).click();
    await page.getByLabel('举报成立').check();
    await page.getByRole('button', { name: '处罚动作' }).click();
    await page.getByRole('option', { name: '维持暂停' }).click();
    await page.getByLabel('处理备注').fill('维持现有暂停');
    await page.getByRole('button', { name: '提交处理' }).click();
    await expect(page.locator('.admin-detail-hero').getByText('已处理')).toBeVisible();
    expect((await adminUserDetail(page, admin.token, reported.id)).status).toBe('SUSPENDED');

    // 举报不成立：不改用户状态，举报人看到「举报不成立」。
    const third = await page.request.post(`${API}/reports`, {
      headers: writeHeaders(reporter.id),
      data: { target_type: 'user', target_id: reported.id, reason: 'other', note: '误报' },
    });
    expect(third.status()).toBe(201);
    const thirdReport = await findReportId(
      page,
      reporter.token,
      (item) => item.target_id === reported.id && item.reason === 'other',
    );
    const startThird = await page.request.post(`${API}/admin/reports/${thirdReport.id}/start`, {
      headers: bearer(admin.token),
    });
    expect(startThird.ok()).toBeTruthy();
    const reject = await page.request.post(`${API}/admin/reports/${thirdReport.id}/resolve`, {
      headers: { ...bearer(admin.token), 'Content-Type': 'application/json' },
      data: { outcome: 'REJECTED', note: '证据不足，举报不成立' },
    });
    expect(reject.ok()).toBeTruthy();
    expect(((await reject.json()) as { status: string }).status).toBe('REJECTED');
    expect((await adminUserDetail(page, admin.token, reported.id)).status).toBe('SUSPENDED');

    await loginAsAccount(page, reporter);
    await page.goto('/#/help');
    await expect(
      page.locator('.help-report').filter({ hasText: thirdReport.code }),
    ).toContainText('举报不成立');
  });
});

test.describe('[I3] customer service workbench', () => {
  test('[I3] joins, replies, filters and closes a service session', async ({ page }) => {
    const user = await createUserViaApi(page, `客服用户_${Date.now()}`);
    const opened = await page.request.post(`${API}/service/sessions`, {
      headers: bearer(user.token),
    });
    expect(opened.ok()).toBeTruthy();
    const session = (await opened.json()) as { id: number; status: string };
    expect(session.status).toBe('WAITING');

    const admin = await loginAsAdmin(page);
    await page.goto('/#/admin/service');
    await expect(page.getByRole('heading', { name: '客户服务' })).toBeVisible();

    await page.getByRole('button', { name: '会话状态' }).click();
    await page.getByRole('option', { name: '等待接入' }).click();
    const queueItem = page.locator('.admin-queue-item').filter({ hasText: user.nickname });
    await expect(queueItem).toBeVisible();
    await queueItem.click();

    await expect(page.getByText('用户资料').first()).toBeVisible();
    await expect(page.getByText('相关举报').first()).toBeVisible();
    await page.getByRole('button', { name: '接入会话' }).click();
    await expect(page.getByText('处理中').first()).toBeVisible();

    const userMessage = '客服你好，我的行程无法发布';
    const userSend = await page.request.post(`${API}/service/sessions/${session.id}/messages`, {
      headers: { ...bearer(user.token), 'Content-Type': 'application/json' },
      data: { content: userMessage },
    });
    expect(userSend.status()).toBe(201);
    await expect(page.locator('.service-chat .bubble').filter({ hasText: userMessage })).toBeVisible({
      timeout: 5000,
    });

    const adminReply = '已收到，请提供行程标题';
    await page.getByPlaceholder('输入回复（500 字以内）').fill(adminReply);
    await page.getByRole('button', { name: /发\s*送/ }).click();
    await expect(page.locator('.service-chat .bubble').filter({ hasText: adminReply })).toBeVisible();

    const userView = await page.request.get(`${API}/service/sessions/current`, {
      headers: bearer(user.token),
    });
    expect(userView.ok()).toBeTruthy();
    expect(((await userView.json()) as { status: string }).status).toBe('HANDLING');

    await page.getByRole('button', { name: '结束会话' }).click();
    await page.getByRole('button', { name: /确\s*认/ }).click();
    await expect(page.getByText('会话已结束，只能查看历史消息。')).toBeVisible();
    await expect(page.locator('.service-chat .bubble').filter({ hasText: userMessage })).toBeVisible();

    await page.getByRole('button', { name: '会话状态' }).click();
    await page.getByRole('option', { name: '已结束' }).click();
    await expect(page.locator('.admin-queue-item').filter({ hasText: user.nickname })).toBeVisible();

    const closedDetail = await page.request.get(`${API}/admin/service/sessions/${session.id}`, {
      headers: bearer(admin.token),
    });
    expect(closedDetail.ok()).toBeTruthy();
    const closed = (await closedDetail.json()) as {
      status: string;
      messages: { content: string; sender_type: string }[];
    };
    expect(closed.status).toBe('CLOSED');
    expect(closed.messages.some((message) => message.content === adminReply)).toBe(true);
    expect(closed.messages.some((message) => message.sender_type === 'ADMIN')).toBe(true);
  });
});