import { expect, test, type Page } from '@playwright/test';
import { installAmapStub } from './support/amapStub';

/**
 * MVP 完整闭环：登录 → 创建行程 → 申请同行 → 发布者批准 → 出行（结束行程）
 * → 发布者与同行者各自写下游后体验。
 *
 * <p>全流程只通过 UI 操作，API 不参与，用来验证「页面之间的接力」而不只是单页行为。
 * 种子账号来自 V15：linjianxia（林见夏 / 发布者）、chenyu（陈屿 / 申请者），密码 123456。
 */

const PUBLISHER = { username: 'linjianxia', password: '123456', nickname: '林见夏' };
const APPLICANT = { username: 'chenyu', password: '123456', nickname: '陈屿' };

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 登录门：真实走登录表单，而不是往 localStorage 塞身份。 */
async function loginThroughGate(page: Page, account: { username: string; password: string; nickname: string }) {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
  await page.getByLabel('用户名').fill(account.username);
  await page.getByLabel('密码').fill(account.password);
  await page.getByRole('button', { name: /^登\s*录$/ }).click();
  // 登录成功后侧栏底部出现账号入口，aria-label 为「账号：昵称」。
  await expect(page.getByRole('button', { name: `账号：${account.nickname}` })).toBeVisible();
}

/** 账号菜单退出登录，回到身份门。 */
async function logoutThroughMenu(page: Page) {
  await page.getByRole('button', { name: /^账号：/ }).click();
  const menu = page.getByRole('menu', { name: '账号菜单' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: '退出登录' }).click();
  await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
}

async function pickDestination(page: Page, province: string, city: string) {
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('.area-option', { hasText: province }).first().click();
  await page.locator('.area-option', { hasText: city }).first().click();
}

async function setDate(page: Page, label: string, iso: string) {
  const input = page.getByLabel(label);
  await input.fill(iso);
  await input.press('Enter');
}

/** 发布页路线编辑器：搜索候选加入途经点（与探索页同一套面板）。 */
async function addRouteStop(page: Page, name: string) {
  const editor = page.locator('.publish-route-editor');
  await editor.locator('#trip-stops').fill(name);
  const option = editor.locator('.amap-search-item').filter({ hasText: name }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(editor.locator('.amap-waypoint-text b').filter({ hasText: name }).first()).toBeVisible();
}

test.describe('MVP 完整闭环', () => {
  // 一条用例串起 6 个页面 + 两次身份切换，30 秒不够。
  test.setTimeout(180_000);

  test('登录 → 创建 → 批准申请 → 出行 → 双方评价', async ({ page }) => {
    await installAmapStub(page);

    // 1) 发布者登录，从首页发布一条今天的行程：当天即「旅行中」，可直接走完出行环节。
    await loginThroughGate(page, PUBLISHER);
    await page.getByRole('link', { name: '发布行程' }).first().click();
    await expect(page).toHaveURL(/#\/trips\/new$/);

    const title = `E2E 完整闭环 ${Date.now()}`;
    const day = todayIso();
    await page.getByLabel('标题').fill(title);
    await pickDestination(page, '广东省', '珠海市');
    await setDate(page, '出发日期', day);
    await setDate(page, '结束日期', day);
    await addRouteStop(page, '香洲港');
    await addRouteStop(page, '情侣路');
    await page.getByRole('checkbox', { name: /摄影/ }).click();
    await page.getByRole('button', { name: /^发\s*布/ }).click();

    await expect(page).toHaveURL(/#\/trips\/\d+$/);
    const tripId = Number(page.url().match(/#\/trips\/(\d+)$/)?.[1]);
    expect(Number.isInteger(tripId)).toBeTruthy();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('这是你发布的行程')).toBeVisible();
    await expect(page.getByText('旅行中').first()).toBeVisible();

    // 2) 换申请者登录，在详情页留下说明并提交同行申请；待处理时聊天不开放。
    await logoutThroughMenu(page);
    await loginThroughGate(page, APPLICANT);
    await page.goto(`/#/trips/${tripId}`);

    await page
      .locator('.apply-form textarea')
      .fill('这条线我走过一半，想补上日落那段，可以帮忙背装备。');
    await page.getByRole('button', { name: '提交同行申请' }).click();
    await expect(page.getByText(`申请已提交，等待 ${PUBLISHER.nickname} 回应。`)).toBeVisible();
    await expect(page.getByRole('button', { name: `与 ${PUBLISHER.nickname} 沟通` })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '撤回申请' })).toBeVisible();

    // 3) 发布者处理申请：批准后申请状态变为「已匹配同行」，并开放聊天入口。
    await logoutThroughMenu(page);
    await loginThroughGate(page, PUBLISHER);
    await page.goto(`/#/trips/${tripId}`);
    await page.getByRole('button', { name: /查看同行的申请/ }).click();
    await expect(page).toHaveURL(new RegExp(`#/trips/${tripId}/applications$`));

    const applicationRow = page.locator('.application-list li', { hasText: APPLICANT.nickname });
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByText('申请待处理')).toBeVisible();
    await applicationRow.getByRole('button', { name: /^接\s*受$/ }).click();
    await expect(applicationRow.getByText('已匹配同行')).toBeVisible();
    await expect(applicationRow.getByRole('button', { name: '进入聊天' })).toBeVisible();

    // 4) 回到详情页：同行者入列，发布者结束行程完成「出行」。
    await page.goto(`/#/trips/${tripId}`);
    await expect(page.locator('.detail-companions').getByText(APPLICANT.nickname)).toBeVisible();

    const primary = page.locator('.detail-actions-primary');
    await expect(primary.getByRole('button', { name: '结束行程' })).toBeVisible();
    await primary.getByRole('button', { name: '结束行程' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '结束行程' }).click();
    await expect(page.getByText('已结束').first()).toBeVisible();
    await expect(page.getByText('游后真实体验')).toBeVisible();
    await expect(primary.getByRole('button', { name: '结束行程' })).toHaveCount(0);

    // 5) 发布者写下第一条体验。
    const publisherContent = `路线平缓，情侣路日落前四十分钟到海边刚好，晚一点机位就满了。${Date.now()}`;
    await page.getByRole('button', { name: '发表游后体验' }).click();
    await expect(page).toHaveURL(new RegExp(`#/share/${tripId}$`));
    await page.getByPlaceholder(/路况、强度、时间点/).fill(publisherContent);
    await page.getByRole('radio', { name: /适中/ }).check();
    await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('日落前 40 分钟到海滨泳场。');
    await page.getByRole('button', { name: '发布体验' }).click();

    await expect(page).toHaveURL(new RegExp(`#/trips/${tripId}$`));
    await expect(page.getByText(publisherContent)).toBeVisible();
    await expect(page.getByText('强度 · 适中').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '修改我的体验' })).toBeVisible();

    // 6) 同行者也写一条：双方体验都留在同一条行程下。
    await logoutThroughMenu(page);
    await loginThroughGate(page, APPLICANT);
    await page.goto(`/#/trips/${tripId}`);
    await expect(page.getByText(`你已在同行名单中，可以和发起人确认集合与安排。`)).toBeVisible();

    const applicantContent = `第一次跟队走完全程，香洲港集合很顺利，骑到后半段海风有点大。${Date.now()}`;
    await page.getByRole('button', { name: '发表游后体验' }).click();
    await expect(page).toHaveURL(new RegExp(`#/share/${tripId}$`));
    await page.getByPlaceholder(/路况、强度、时间点/).fill(applicantContent);
    await page.getByRole('radio', { name: /较累/ }).check();
    await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('带一件防风外套，海风比预报大。');
    await page.getByRole('button', { name: '发布体验' }).click();

    await expect(page).toHaveURL(new RegExp(`#/trips/${tripId}$`));
    const experienceList = page.locator('.experience-list li');
    await expect(experienceList).toHaveCount(2);
    await expect(experienceList.filter({ hasText: PUBLISHER.nickname })).toContainText(publisherContent);
    await expect(experienceList.filter({ hasText: APPLICANT.nickname })).toContainText(applicantContent);
    await expect(page.getByRole('button', { name: '修改我的体验' })).toBeVisible();

    // 7) 体验进入灵感首页「旅行体验」视图，闭环对外可见。
    await page.goto('/');
    await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
    await expect(page.getByText(applicantContent)).toBeVisible();
  });
});
