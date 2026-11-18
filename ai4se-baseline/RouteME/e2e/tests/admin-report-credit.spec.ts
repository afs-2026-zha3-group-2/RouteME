import { expect, test, type Page } from '@playwright/test';
import {
  API,
  createUserViaApi,
  loginAsAccount,
  loginAsAdmin,
  type ApiAccount,
} from './support';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const writeHeaders = (userId: number) => ({
  'X-User-Id': String(userId),
  'Content-Type': 'application/json',
});

type HelpReportItem = {
  id: number;
  code: string;
  target_type: string;
  target_id: number;
  target_label: string;
  reason: string;
  created_at: string;
  status: string;
};

/** 提交一条用户举报，并从「我的举报」取回服务端编号（POST /reports 只返回 received）。 */
async function submitUserReport(
  page: Page,
  reporter: ApiAccount,
  targetId: number,
  note: string,
): Promise<number> {
  const created = await page.request.post(`${API}/reports`, {
    headers: writeHeaders(reporter.id),
    data: { target_type: 'user', target_id: targetId, reason: 'other', note },
  });
  expect(created.status()).toBe(201);

  const list = await page.request.get(`${API}/help/reports`, {
    headers: bearer(reporter.token),
  });
  expect(list.ok()).toBeTruthy();
  const body = (await list.json()) as { items: HelpReportItem[] };
  const found = body.items.find((item) => item.target_id === targetId && item.status === 'PENDING');
  expect(found, 'new report should be pending').toBeTruthy();
  return found!.id;
}

async function startReport(page: Page, adminToken: string, reportId: number) {
  const response = await page.request.post(`${API}/admin/reports/${reportId}/start`, {
    headers: bearer(adminToken),
  });
  expect(response.ok()).toBeTruthy();
}

async function resolveReport(
  page: Page,
  adminToken: string,
  reportId: number,
  body: Record<string, unknown>,
) {
  const response = await page.request.post(`${API}/admin/reports/${reportId}/resolve`, {
    headers: { ...bearer(adminToken), 'Content-Type': 'application/json' },
    data: body,
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Record<string, unknown>;
}

/** 通过一条完整的举报扣分把用户分数降到目标值（仅用于构造 E4 的低分夹具）。 */
async function deductViaReport(
  page: Page,
  adminToken: string,
  reporter: ApiAccount,
  targetId: number,
  violationType: string,
) {
  const reportId = await submitUserReport(page, reporter, targetId, `夹具：${violationType}`);
  await startReport(page, adminToken, reportId);
  await resolveReport(page, adminToken, reportId, {
    outcome: 'RESOLVED',
    note: `夹具扣分 ${violationType}`,
    violation_type: violationType,
  });
}

async function profileCredit(page: Page, userId: number) {
  const response = await page.request.get(`${API}/users/${userId}/profile`, {
    headers: { 'X-User-Id': String(userId) },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { credit_score: number; credit_level: string };
  return body;
}

async function adminUserStatus(page: Page, adminToken: string, userId: number) {
  const response = await page.request.get(`${API}/admin/users/${userId}`, {
    headers: bearer(adminToken),
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { status: string }).status;
}

async function openProcessingReport(page: Page, reportId: number) {
  await page.goto(`/#/admin/reports/${reportId}`);
  await expect(page.getByRole('heading', { name: '举报详情' })).toBeVisible();
  await expect(page.locator('.admin-detail-hero')).toBeVisible();
  // 夹具已通过 API 开始处理；仅 PENDING 时点「开始处理」。
  const start = page.getByRole('button', { name: '开始处理' });
  if (await start.isVisible()) {
    await start.click();
    await expect(page.locator('.admin-detail-hero').getByText('处理中')).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: '处理举报' })).toBeVisible();
  return page.locator('.admin-form');
}

test.describe('[I4] report credit deduction', () => {
  test('[E1/E2/E3/R1] form only keeps violation type, validates and previews three steps', async ({
    page,
  }) => {
    const reporter = await createUserViaApi(page, `扣分举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `扣分被举报_${Date.now()}`);
    const reportId = await submitUserReport(page, reporter, reported.id, 'E2E 表单检查');
    const admin = await loginAsAdmin(page);
    await startReport(page, admin.token, reportId);

    const form = await openProcessingReport(page, reportId);
    // E1 / R1：举报页不再出现账号处罚入口。
    await expect(form.getByText('处罚动作')).toHaveCount(0);
    await expect(form.getByText('封禁理由')).toHaveCount(0);
    await expect(form.getByText('解封时间')).toHaveCount(0);
    await expect(
      form.getByRole('button', { name: /暂停账号|封禁账号|恢复账号|维持暂停/ }),
    ).toHaveCount(0);

    const resolveCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(`/api/admin/reports/${reportId}/resolve`)) {
        resolveCalls.push(request.url());
      }
    });

    await page.getByLabel('举报成立').check();
    await page.getByLabel('违规原因').fill('E2E：核实存在虚假信息');
    await page.getByRole('button', { name: '提交处理' }).click();
    // E2：类型必选，前端拦截且不发请求。
    await expect(form.locator('.ant-typography-danger')).toHaveText('请选择违规类型');

    await page.getByRole('button', { name: '违规类型' }).click();
    await page.getByRole('option', { name: '其他原因' }).click();
    await page.getByRole('button', { name: '提交处理' }).click();
    await expect(form.locator('.ant-typography-danger')).toHaveText('请选择扣分档位');
    await page.waitForTimeout(300);
    expect(resolveCalls).toEqual([]);

    // E3：三段预览 80 → 15 → 65（OTHER 档位切换不影响固定扣分预览）。
    await page.getByRole('button', { name: '其他原因扣分档位' }).click();
    await page.getByRole('option', { name: '-20' }).click();
    await page.getByRole('button', { name: '违规类型' }).click();
    await page.getByRole('option', { name: '发布虚假行程信息（-15）' }).click();

    const preview = page.getByTestId('report-deduction-preview');
    await expect(preview).toBeVisible();
    const values = preview.locator('.admin-deduction-value');
    await expect(values).toHaveText(['80', '-15', '65']);

    // 预览只读；未提交前服务端分数不变。
    expect((await profileCredit(page, reported.id)).credit_score).toBe(80);
  });

  test('[E4] preview truncates the resulting score at zero', async ({ page }) => {
    const reporter = await createUserViaApi(page, `截断举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `截断被举报_${Date.now()}`);
    const admin = await loginAsAdmin(page);

    // 80 → 50 → 20 → 5（真实扣分链路，不直接改库）。
    await deductViaReport(page, admin.token, reporter, reported.id, 'FRAUD_RISK');
    await deductViaReport(page, admin.token, reporter, reported.id, 'FRAUD_RISK');
    await deductViaReport(page, admin.token, reporter, reported.id, 'FAKE_TRIP');
    expect((await profileCredit(page, reported.id)).credit_score).toBe(5);

    const reportId = await submitUserReport(page, reporter, reported.id, 'E2E 截断预览');
    await startReport(page, admin.token, reportId);
    await openProcessingReport(page, reportId);

    await page.getByLabel('举报成立').check();
    await page.getByRole('button', { name: '违规类型' }).click();
    await page.getByRole('option', { name: '骚扰或不当言论（-10）' }).click();

    const preview = page.getByTestId('report-deduction-preview');
    await expect(preview.locator('.admin-deduction-value')).toHaveText(['5', '-10', '0']);
    await expect(preview).toContainText('处理后分数按 0 截断；实际扣分以服务端记账为准');
  });

  test('[E5/R2] upholds a report, deducts credit and keeps the account status', async ({ page }) => {
    const reporter = await createUserViaApi(page, `成立举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `成立被举报_${Date.now()}`);
    const reportId = await submitUserReport(page, reporter, reported.id, 'E2E 成立并扣分');
    const admin = await loginAsAdmin(page);

    await openProcessingReport(page, reportId);
    await page.getByLabel('举报成立').check();
    await page.getByRole('button', { name: '违规类型' }).click();
    await page.getByRole('option', { name: '发布虚假行程信息（-15）' }).click();
    await page.getByLabel('违规原因').fill('E2E：行程描述与聊天约定不一致');
    await page.getByRole('button', { name: '提交处理' }).click();

    await expect(page.locator('.admin-detail-hero').getByText('已处理')).toBeVisible();
    const history = page.locator('.admin-panel').filter({ hasText: '处置记录' });
    await expect(history).toContainText('发布虚假行程信息');
    await expect(history).toContainText('-15');
    await expect(history).toContainText('E2E：行程描述与聊天约定不一致');

    const credit = await profileCredit(page, reported.id);
    expect(credit.credit_score).toBe(65);
    // R2：扣分不改账号状态，账号处置仍归用户管理页。
    expect(await adminUserStatus(page, admin.token, reported.id)).toBe('ACTIVE');

    // 处理结果持久化：刷新后详情仍显示违规类型与本次扣分。
    await page.reload();
    await expect(page.locator('.admin-detail-hero').getByText('已处理')).toBeVisible();
    await expect(page.locator('.admin-panel').filter({ hasText: '处置记录' })).toContainText(
      '发布虚假行程信息',
    );
  });

  test('[E6] rejects a report without deduction preview', async ({ page }) => {
    const reporter = await createUserViaApi(page, `驳回举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `驳回被举报_${Date.now()}`);
    const reportId = await submitUserReport(page, reporter, reported.id, 'E2E 驳回');
    const admin = await loginAsAdmin(page);

    const form = await openProcessingReport(page, reportId);
    await page.getByLabel('举报不成立').check();
    await expect(page.getByTestId('report-deduction-preview')).toHaveCount(0);
    await expect(form.getByText('违规类型', { exact: true })).toHaveCount(0);

    await page.getByLabel('驳回说明').fill('E2E：证据不足，举报不成立');
    await page.getByRole('button', { name: '提交处理' }).click();

    await expect(page.locator('.admin-detail-hero').getByText('举报不成立')).toBeVisible();
    await expect(page.locator('.admin-panel').filter({ hasText: '处置记录' })).toContainText(
      'E2E：证据不足，举报不成立',
    );
    expect((await profileCredit(page, reported.id)).credit_score).toBe(80);
    expect(await adminUserStatus(page, admin.token, reported.id)).toBe('ACTIVE');
  });

  test('[E7] degrades historical reports without violation fields', async ({ page }) => {
    const reporter = await createUserViaApi(page, `历史举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `历史被举报_${Date.now()}`);
    const reportId = await submitUserReport(page, reporter, reported.id, 'E2E 历史降级');
    const admin = await loginAsAdmin(page);
    await startReport(page, admin.token, reportId);
    await resolveReport(page, admin.token, reportId, {
      outcome: 'RESOLVED',
      note: 'E2E：历史举报',
      violation_type: 'HARASSMENT',
    });

    // 模拟迁移前的历史行：字段存在但为 null，前端应降级为「—」。
    const detailResponse = await page.request.get(`${API}/admin/reports/${reportId}`, {
      headers: bearer(admin.token),
    });
    expect(detailResponse.ok()).toBeTruthy();
    const detail = (await detailResponse.json()) as Record<string, unknown>;
    detail.violation_type = null;
    detail.applied_deduction = null;
    await page.route(`**/api/admin/reports/${reportId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(detail),
      }),
    );

    await page.goto(`/#/admin/reports/${reportId}`);
    await expect(page.getByRole('heading', { name: '举报详情' })).toBeVisible();
    await expect(page.locator('.admin-detail-hero').getByText('已处理')).toBeVisible();
    const violationRow = page.locator('.admin-facts > div').filter({ hasText: '违规类型' });
    await expect(violationRow.locator('dd')).toHaveText('—');
    const deductionRow = page.locator('.admin-facts > div').filter({ hasText: '本次扣分' });
    await expect(deductionRow.locator('dd')).toHaveText('—');
  });

  test('[E9/R3] hides resolution details from the reporter and adds no credit ledger page', async ({
    page,
  }) => {
    const reporter = await createUserViaApi(page, `回执举报人_${Date.now()}`);
    const reported = await createUserViaApi(page, `回执被举报_${Date.now()}`);
    const reportId = await submitUserReport(page, reporter, reported.id, 'E2E 隐私');
    const admin = await loginAsAdmin(page);
    await startReport(page, admin.token, reportId);
    await resolveReport(page, admin.token, reportId, {
      outcome: 'RESOLVED',
      note: 'E2E：举报人不可见的处理细节',
      violation_type: 'PRIVACY_LEAK',
    });

    // E9：举报人只拿到受理与最终状态，不含违规类型、扣分与处理备注。
    const list = await page.request.get(`${API}/help/reports`, {
      headers: bearer(reporter.token),
    });
    expect(list.ok()).toBeTruthy();
    const items = ((await list.json()) as { items: HelpReportItem[] }).items;
    const item = items.find((candidate) => candidate.id === reportId);
    expect(item?.status).toBe('RESOLVED');
    for (const hidden of ['violation_type', 'applied_deduction', 'resolution_note', 'note']) {
      expect(item, `reporter payload should not expose ${hidden}`).not.toHaveProperty(hidden);
    }

    await loginAsAccount(page, reporter);
    await page.goto('/');
    await expect(page.getByText(/信用明细|加分记录|扣分记录|信用历史/)).toHaveCount(0);
    await page.goto('/#/mine');
    await expect(page.getByText(/信用明细|加分记录|扣分记录|信用历史/)).toHaveCount(0);

    // R3：管理端不新增信用记录入口。
    await loginAsAdmin(page);
    await page.goto('/#/admin');
    await expect(page.locator('.admin-tab').filter({ hasText: '信用' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /信用记录|信用明细/ })).toHaveCount(0);
  });
});
