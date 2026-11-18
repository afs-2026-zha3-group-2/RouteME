import { expect, test, type Page } from '@playwright/test';
import {
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
  loginAs,
} from './support';

const ENTRY_TRIP = '举报这条行程';
const ENTRY_USER = '举报这位用户';
const SAFETY_HINT = '安全提示';
const RECEIPT = '已收到，我们会处理';
const PRIVATE_MARKERS = ['电话：', '身份证', '门牌', '证件号'];

// 只读场景复用种子行程，避免新增行程挤占首页按匹配度取前 15 条的卡片位。
const OTHER_TRIP_ID = 5; // 深圳大鹏半岛海岸线徒步：发布者 user 2，招募中
const OTHER_TRIP_TITLE = '深圳大鹏半岛海岸线徒步';
const OWN_TRIP_ID = 1; // 珠海情侣路摄影一日游：发布者 user 1，已结束

// 夹具行程落在 45 天后：默认匹配列表按出发日期升序只取 20 条，
// 用未来日期可避免本套件新建的行程把 trips.spec.ts 依赖的种子卡片挤出列表。
const FIXTURE_DAYS = 45;

const WIDTHS = [
  { label: '390', width: 390, height: 844 },
  { label: '768', width: 768, height: 900 },
  { label: '1440', width: 1440, height: 900 },
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoSafetyHint(page: Page) {
  await expect(page.locator('.safety-note')).toHaveCount(0);
  await expect(page.getByText(SAFETY_HINT)).toHaveCount(0);
}

test('shows the trip report entry in the detail header and no safety hint', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto(`/#/trips/${OTHER_TRIP_ID}`);

  const entry = page.locator('.detail-badges').getByRole('button', { name: ENTRY_TRIP });
  await expect(entry).toBeVisible();
  await expectNoSafetyHint(page);

  for (const size of WIDTHS) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await expect(entry, `entry visible at ${size.label}`).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  for (const size of WIDTHS.filter((candidate) => candidate.width >= 768)) {
    await page.setViewportSize({ width: size.width, height: size.height });
    const tagBox = await page.locator('.detail-badges .ant-tag').first().boundingBox();
    const entryBox = await entry.boundingBox();
    const cardBox = await page.locator('.detail-card').boundingBox();
    expect(tagBox).not.toBeNull();
    expect(entryBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    const entryCenter = entryBox!.y + entryBox!.height / 2;
    expect(entryCenter, `entry shares the badge row at ${size.label}`).toBeGreaterThanOrEqual(
      tagBox!.y,
    );
    expect(entryCenter, `entry shares the badge row at ${size.label}`).toBeLessThanOrEqual(
      tagBox!.y + tagBox!.height,
    );
    expect(entryBox!.x, `entry sits right of the tags at ${size.label}`).toBeGreaterThan(tagBox!.x);
    expect(
      cardBox!.x + cardBox!.width - (entryBox!.x + entryBox!.width),
      `entry hugs the card right edge at ${size.label}`,
    ).toBeLessThanOrEqual(48);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await entry.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('keeps the chat report entry in the header, including read-only chats', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/chat/1/2');

  await expect(page.getByText('该行程已结束，只能查看历史消息。')).toBeVisible();
  const entry = page.getByRole('button', { name: ENTRY_USER });
  await expect(entry).toBeVisible();
  await expectNoSafetyHint(page);

  for (const size of WIDTHS) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await expect(entry, `entry visible at ${size.label}`).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  for (const size of WIDTHS.filter((candidate) => candidate.width >= 768)) {
    await page.setViewportSize({ width: size.width, height: size.height });
    const avatarBox = await page.locator('.chat-head .avatar').boundingBox();
    const entryBox = await entry.boundingBox();
    expect(avatarBox).not.toBeNull();
    expect(entryBox).not.toBeNull();
    expect(
      entryBox!.x,
      `entry sits opposite the avatar at ${size.label}`,
    ).toBeGreaterThan(avatarBox!.x + avatarBox!.width);
  }
});

test('shows the target, four reasons, confidentiality and emergency text', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto(`/#/trips/${OTHER_TRIP_ID}`);
  await page.locator('.detail-badges').getByRole('button', { name: ENTRY_TRIP }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toHaveText(ENTRY_TRIP);
  await expect(dialog.getByText(`举报对象：${OTHER_TRIP_TITLE}。`)).toBeVisible();
  await expect(dialog.getByText('我们不会向对方透露你的身份。')).toBeVisible();
  await expect(
    dialog.getByText(
      '如果你正处于危险中，请立即拨打 110 报警；平台举报不能替代紧急求助。',
    ),
  ).toBeVisible();
  await expect(dialog.getByText('补充说明（选填，200 字以内）')).toBeVisible();

  await dialog.getByRole('button', { name: '举报原因' }).click();
  const options = dialog.getByRole('listbox', { name: '举报原因' }).getByRole('option');
  await expect(options).toHaveCount(4);
  await expect(options).toHaveText(['骚扰或不当言行', '虚假信息', /^安全风险/, '其他']);
});

test('hides the entry on your own trip but keeps the pre-publish note', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto(`/#/trips/${OWN_TRIP_ID}`);
  await expect(page.getByRole('button', { name: ENTRY_TRIP })).toHaveCount(0);
  await expectNoSafetyHint(page);

  await page.goto('/#/share/1');
  await expect(page.getByText(SAFETY_HINT)).toBeVisible();
  await expect(page.getByRole('button', { name: /^举报/ })).toHaveCount(0);
});

test('submits once, shows the receipt and closes without changing state', async ({ page }) => {
  const title = `E2E 举报回执 ${Date.now()}`;
  const created = await createTripViaApi(page, 2, title, { daysFromToday: FIXTURE_DAYS });
  await applyViaApi(page, 1, created.id, '想一起走。');
  await acceptApplicationViaApi(page, 2, created.id, 1);
  const sent = await page.request.post(`/api/trips/${created.id}/messages`, {
    headers: { 'X-User-Id': '2', 'Content-Type': 'application/json' },
    data: { receiver_id: 1, content: '周六九点见。' },
  });
  expect(sent.ok()).toBeTruthy();

  await loginAs(page, 1);
  await page.goto(`/#/chat/${created.id}/2`);
  await expect(page.locator('.chat-body .msg .bubble').first()).toBeVisible();
  const messagesBefore = await page.locator('.chat-body .msg .bubble').count();

  await page.getByRole('button', { name: ENTRY_USER }).click();
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().includes('/api/reports') &&
        candidate.request().method() === 'POST',
    ),
    page.getByRole('button', { name: '提交举报' }).click(),
  ]);
  expect(response.status()).toBe(201);
  expect((await response.json()).received).toBe(true);

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(RECEIPT)).toBeVisible();
  await expect(dialog.getByText('关闭弹窗只结束回执展示')).toHaveCount(0);
  const footerButtons = dialog.locator('.ant-modal-footer').getByRole('button');
  await expect(footerButtons).toHaveCount(1);
  await expect(footerButtons).toHaveText(/^关\s*闭$/);
  await footerButtons.click();
  await expect(dialog).toHaveCount(0);

  await expect(page.locator('.chat-body .msg .bubble')).toHaveCount(messagesBefore);
  await expect(page.getByPlaceholder('输入消息，Enter 发送，Shift + Enter 换行')).toBeVisible();
});

test('keeps the reason and note on failure and retries to a single receipt', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto(`/#/trips/${OTHER_TRIP_ID}`);
  await page.locator('.detail-badges').getByRole('button', { name: ENTRY_TRIP }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('textarea').fill('网络故障时保留这段说明。');
  await page.route('**/api/reports', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'INTERNAL_ERROR' }),
    }),
  );
  await dialog.getByRole('button', { name: '提交举报' }).click();

  await expect(dialog.getByText('举报提交失败')).toBeVisible();
  await expect(dialog.getByRole('button', { name: '举报原因' })).toHaveText('安全风险');
  await expect(dialog.locator('textarea')).toHaveValue('网络故障时保留这段说明。');

  await page.unroute('**/api/reports');
  await dialog.getByRole('button', { name: '提交举报' }).click();
  await expect(dialog.getByText(RECEIPT)).toHaveCount(1);
});

test('never exposes private contact fields on the safety surfaces', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto(`/#/trips/${OTHER_TRIP_ID}`);
  const body = page.locator('body');
  for (const marker of PRIVATE_MARKERS) {
    await expect(body).not.toContainText(marker);
  }

  await page.locator('.detail-badges').getByRole('button', { name: ENTRY_TRIP }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const marker of PRIVATE_MARKERS) {
    await expect(dialog).not.toContainText(marker);
  }
  await page.keyboard.press('Escape');

  await page.goto('/#/chat/1/2');
  await expect(page.getByRole('button', { name: ENTRY_USER })).toBeVisible();
  for (const marker of PRIVATE_MARKERS) {
    await expect(body).not.toContainText(marker);
  }
});