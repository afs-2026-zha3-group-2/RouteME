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

test.describe('[M] admin dashboard overview', () => {
  const CARD_IDS = ['users', 'trips', 'applications', 'experiences', 'reports', 'service'];

  test('[M1] admin lands on the overview with six cards and a snapshot time', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: '管理后台' }).first().click();

    await expect(page).toHaveURL(/#\/admin$/);
    await expect(page.getByRole('heading', { name: '概览' })).toBeVisible();
    await expect(page.getByTestId('dashboard-page')).toBeVisible();

    for (const id of CARD_IDS) {
      await expect(page.getByTestId(`dashboard-card-${id}`)).toBeVisible();
      const total = await page.getByTestId(`dashboard-card-${id}-total`).textContent();
      // 共享库不断言绝对值，只确认是非负整数（允许千分位）。
      expect(total ?? '').toMatch(/^\d{1,3}(,\d{3})*$/);
    }

    await expect(page.getByTestId('dashboard-updated-at')).toContainText('最近更新');
    await expect(page.getByTestId('dashboard-chart-users-role')).toBeVisible();
    await expect(page.getByTestId('dashboard-chart-users-status')).toBeVisible();
    // 概览是后台第一个 Tab。
    await expect(page.locator('.admin-tab').first()).toHaveText('概览');
  });

  test('[M2] only users, reports and service cards navigate', async ({ page }) => {
    await loginAsAdmin(page);

    for (const id of ['trips', 'applications', 'experiences']) {
      await page.goto('/#/admin');
      await expect(page.getByTestId('dashboard-page')).toBeVisible();
      const card = page.getByTestId(`dashboard-card-${id}`);
      await expect(card).toBeVisible();
      expect(await card.getAttribute('href')).toBeNull();
      await expect(card.locator('a')).toHaveCount(0);
      await card.click();
      await expect(page).toHaveURL(/#\/admin$/);
    }

    await page.goto('/#/admin');
    await page.getByTestId('dashboard-card-users').click();
    await expect(page).toHaveURL(/#\/admin\/users$/);
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

    await page.goto('/#/admin');
    await page.getByTestId('dashboard-card-reports').click();
    await expect(page).toHaveURL(/#\/admin\/reports$/);
    await expect(page.getByRole('heading', { name: '举报管理' })).toBeVisible();

    await page.goto('/#/admin');
    await page.getByTestId('dashboard-card-service').click();
    await expect(page).toHaveURL(/#\/admin\/service$/);
    await expect(page.getByRole('heading', { name: '客户服务' })).toBeVisible();
  });

  test('[M3] non-admin sees the guard and issues no dashboard request', async ({ page }) => {
    const outsider = await createUserViaApi(page, `概览越权_${Date.now()}`);
    await loginAsAccount(page, outsider);

    const adminRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/admin/')) {
        adminRequests.push(request.url());
      }
    });

    await page.goto('/#/admin');
    await expect(page.getByText('没有访问权限')).toBeVisible();
    await expect(page.getByTestId('dashboard-page')).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(adminRequests).toEqual([]);
  });

  test('[M4] shows an error and recovers on retry', async ({ page }) => {
    await loginAsAdmin(page);

    await page.route('**/api/admin/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR' }),
      });
    });

    await page.goto('/#/admin');
    await expect(page.getByTestId('dashboard-error')).toBeVisible();
    await expect(page.getByTestId('dashboard-page')).toHaveCount(0);

    await page.unroute('**/api/admin/dashboard');
    await page.getByTestId('dashboard-retry').click();
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    await expect(page.getByTestId('dashboard-error')).toHaveCount(0);
  });

  test('[M5] does not poll while the overview stays open', async ({ page }) => {
    await loginAsAdmin(page);
    await page.clock.install();

    let dashboardRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/admin/dashboard')) {
        dashboardRequests += 1;
      }
    });

    await page.goto('/#/admin');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    // 开发态 React StrictMode 会双调用 effect；这里只关心“稳定后不再新增请求”。
    const settled = dashboardRequests;
    expect(settled).toBeGreaterThan(0);

    await page.clock.fastForward(60_000);
    await page.waitForTimeout(300);
    expect(dashboardRequests).toBe(settled);
  });

  test('[M6] admin navigation keeps browse/publish/planning and hides user-only entries', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    const rail = page.locator('.rail-link');
    await expect(rail.filter({ hasText: '旅行灵感' })).toBeVisible();
    await expect(rail.filter({ hasText: '发布行程' })).toBeVisible();
    await expect(rail.filter({ hasText: 'AI 规划' })).toBeVisible();
    await expect(rail.filter({ hasText: '管理后台' })).toBeVisible();
    await expect(rail.filter({ hasText: '帮助与反馈' })).toHaveCount(0);
    await expect(rail.filter({ hasText: '我的旅行' })).toHaveCount(0);
    await expect(rail.filter({ hasText: '同行消息' })).toHaveCount(0);
    await expect(rail.filter({ hasText: '联系客服' })).toHaveCount(0);
    await expect(page.locator('.support-fab')).toHaveCount(0);

    await page.goto('/#/admin');
    await expect(page.locator('.admin-tab').filter({ hasText: '帮助与反馈' })).toHaveCount(0);
  });
});

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
    await expect(page).toHaveURL(/#\/admin$/);
    await page.getByRole('link', { name: '用户管理' }).click();
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

    // BANNED 仍可在用户管理页更新封禁或恢复（举报页已不再提供处罚动作）。
    await expect(page.getByRole('button', { name: '更新封禁' })).toBeVisible();
    await expect(page.getByRole('button', { name: '恢复账号' })).toBeVisible();
    await expect(page.getByRole('button', { name: '封禁账号' })).toHaveCount(0);
    await page.getByRole('button', { name: '更新封禁' }).click();
    await expect(page.locator('.ant-modal-title')).toHaveText('更新封禁');
    await page.getByRole('dialog').getByRole('button', { name: /取\s*消/ }).click();

    const bannedSuspend = await setUserStatusViaApi(page, admin.token, victim.id, {
      action: 'SUSPEND',
      reason: '非法迁移',
    });
    expect(bannedSuspend.status()).toBe(409);
    expect(((await bannedSuspend.json()) as { code: string }).code).toBe(
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

    // 更新封禁：新的理由 / 补充说明 / 解封时间覆盖旧值。
    const updatedBan = await setUserStatusViaApi(page, admin.token, victim.id, {
      action: 'BAN',
      reason: '延长封禁',
      ban_reason_code: 'PRIVACY_LEAK',
      ban_reason_note: '再次泄露隐私',
      ban_expires_at: '2035-06-01T12:00:00Z',
    });
    expect(updatedBan.ok()).toBeTruthy();
    const updatedDetail = await adminUserDetail(page, admin.token, victim.id);
    expect(updatedDetail.status).toBe('BANNED');
    expect(updatedDetail.ban_reason_code).toBe('PRIVACY_LEAK');
    expect(updatedDetail.ban_reason_note).toBe('再次泄露隐私');

    // 恢复：BANNED 可直接恢复为 ACTIVE，封禁信息只保留为历史。
    const restored = await setUserStatusViaApi(page, admin.token, victim.id, {
      action: 'RESTORE',
      reason: '人工复核恢复',
    });
    expect(restored.ok()).toBeTruthy();
    const restoredDetail = await adminUserDetail(page, admin.token, victim.id);
    expect(restoredDetail.status).toBe('ACTIVE');
    expect(restoredDetail.ban_expires_at ?? null).toBeNull();
    const restoredTrip = await createTripViaApi(page, victim.id, `恢复后行程_${Date.now()}`);
    expect(restoredTrip.id).toBeGreaterThan(0);
  });
});

test.describe('[I2] report queue and resolution', () => {
  test('[I2] processes reports and keeps reporter-visible status private', async ({ page }) => {
    const reporter = await createUserViaApi(page, `举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `被举报人_${Date.now()}`);
    const trip = await createTripViaApi(page, reported.id, `被举报行程_${Date.now()}`);
    const note = 'E2E 举报备注：行程描述与实际情况不符';
    const resolutionNote = 'E2E 处理备注：已核实虚假行程信息';

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

    // 成立表单只留违规类型：未选类型时前端拦截，不发请求。
    const form = page.locator('.admin-form');
    await expect(form.getByText('处罚动作')).toHaveCount(0);
    await expect(form.getByText('封禁理由')).toHaveCount(0);
    await expect(form.getByText('解封时间')).toHaveCount(0);
    await page.getByLabel('举报成立').check();
    await page.getByLabel('违规原因').fill(resolutionNote);
    await page.getByRole('button', { name: '提交处理' }).click();
    await expect(form.locator('.ant-typography-danger')).toHaveText('请选择违规类型');

    await page.getByRole('button', { name: '违规类型' }).click();
    await page.getByRole('option', { name: '发布虚假行程信息（-15）' }).click();
    await expect(
      page.getByTestId('report-deduction-preview').locator('.admin-deduction-value'),
    ).toHaveText(['80', '-15', '65']);
    await page.getByRole('button', { name: '提交处理' }).click();
    await expect(page.locator('.admin-detail-hero').getByText('已处理')).toBeVisible();

    // 扣分落账，但不改账号状态（账号处置留给用户管理页）。
    const reportedDetail = await adminUserDetail(page, admin.token, reported.id);
    expect(reportedDetail.status).toBe('ACTIVE');
    const profile = await page.request.get(`${API}/users/${reported.id}/profile`, {
      headers: { 'X-User-Id': String(reported.id) },
    });
    expect(profile.ok()).toBeTruthy();
    expect(((await profile.json()) as { credit_score: number }).credit_score).toBe(65);

    // 用户侧不再展示举报进度；改由管理员在举报详情确认处理结果与备注。
    await page.goto(`/#/admin/reports/${created.id}`);
    await expect(page.locator('.admin-detail-hero')).toContainText('已处理');

    // 举报不成立：不改账号状态、不扣分。
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
    expect((await adminUserDetail(page, admin.token, reported.id)).status).toBe('ACTIVE');
    expect(((await profile.json()) as { credit_score: number }).credit_score).toBe(65);

    // 举报不成立：状态只在管理后台可见（用户侧不再有举报进度页）。
    await page.goto(`/#/admin/reports/${thirdReport.id}`);
    await expect(page.locator('.admin-detail-hero')).toContainText('举报不成立');
  });
});

test.describe('[I3] customer service workbench', () => {
  test('[I3] surfaces a new user session and message without manual refresh, then handles it', async ({ page }) => {
    const user = await createUserViaApi(page, `客服用户_${Date.now()}`);

    const admin = await loginAsAdmin(page);
    await page.goto('/#/admin/service');
    await expect(page.getByRole('heading', { name: '客户服务' })).toBeVisible();

    // 管理员已经停在队列页，用户之后才发起会话并发消息。
    const opened = await page.request.post(`${API}/service/sessions`, {
      headers: bearer(user.token),
    });
    expect(opened.ok()).toBeTruthy();
    const session = (await opened.json()) as { id: number; status: string };
    expect(session.status).toBe('WAITING');

    const userMessage = '客服你好，我的行程无法发布';
    const userSend = await page.request.post(`${API}/service/sessions/${session.id}/messages`, {
      headers: { ...bearer(user.token), 'Content-Type': 'application/json' },
      data: { content: userMessage },
    });
    expect(userSend.status()).toBe(201);

    // 不点刷新、不改筛选：3 秒轮询把新会话带到队列，页签出现待接入徽标。
    const queueItem = page.locator('.admin-queue-item').filter({ hasText: user.nickname });
    await expect(queueItem).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.admin-tab-badge').first()).toContainText(/\d+/);
    await expect(page.getByText('有会话正在等待接入')).toBeVisible();
    // 旧的刷新提示语已移除。
    await expect(page.getByText('队列与消息每 3 秒自动刷新')).toHaveCount(0);
    // 新消息置顶 + 气泡提示。
    await expect(page.locator('.admin-queue-item').first()).toContainText(user.nickname);
    await expect(queueItem.locator('.admin-queue-bubble')).toContainText('1');
    await queueItem.click();
    await expect(queueItem.locator('.admin-queue-bubble')).toHaveCount(0);

    // 接入前就能读到用户消息（只读预览，不要求先接入）。
    await expect(page.locator('.service-chat .bubble').filter({ hasText: userMessage })).toBeVisible();
    await expect(page.getByText('用户资料').first()).toBeVisible();
    await expect(page.getByText('相关举报').first()).toBeVisible();
    await page.getByRole('button', { name: '接入会话' }).click();
    await expect(page.getByText('处理中').first()).toBeVisible();

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

    await page.getByRole('button', { name: '标记处理完成' }).click();
    await expect(page.getByText('待用户确认').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '结束会话' })).toHaveCount(0);

    // 用户看到待确认后结束会话，管理端 3 秒内转为只读。
    const userClosed = await page.request.post(`${API}/service/sessions/${session.id}/close`, {
      headers: bearer(user.token),
    });
    expect(userClosed.ok()).toBeTruthy();
    await expect(page.getByText('会话已结束，只能查看历史消息。')).toBeVisible({ timeout: 6000 });
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