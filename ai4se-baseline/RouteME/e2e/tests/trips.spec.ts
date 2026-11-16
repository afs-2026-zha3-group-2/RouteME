import { expect, test, type Page } from '@playwright/test';

const API = '/api';

async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

async function pickPlace(page: Page, field: string, name: string) {
  const input = page.getByLabel(field);
  await input.fill(name);
  await input.press('Enter');
  await expect(page.locator('.place-chip-name', { hasText: name }).first()).toBeVisible();
}

async function pickDestination(page: Page, province: string, city: string) {
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator('.area-option', { hasText: province }).first().click();
  await page.locator('.area-option', { hasText: city }).first().click();
}

async function pickDestinationByCode(page: Page, provinceCode: string, cityCode: string) {
  await page.getByRole('button', { name: '目的地', exact: true }).click();
  await page.locator(`[data-area-province="${provinceCode}"]`).click();
  await page.locator(`[data-area-city="${cityCode}"]`).click();
}

async function setDate(page: Page, label: string, iso: string) {
  const input = page.getByLabel(label);
  await input.fill(iso);
  await input.press('Enter');
}


/** 前序用例会创建行程，切到每页 45 条避免 seed 卡片被挤到第二页。 */
async function expandPageSize(page: Page) {
  const select = page.getByLabel('每页条数');
  if ((await select.count()) > 0) {
    await select.selectOption('45');
  }
}

/** Local calendar day, matching the form's default (never UTC). */
function todayIso(): string {
  return isoDaysFromToday(0);
}

function isoDaysFromToday(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function createTripViaApi(
  page: Page,
  title: string,
  startDate = todayIso(),
  endDate = startDate,
  options: {
    destinationCode?: string;
    stops?: string[];
    meetingAreas?: string[] | null;
    meetingTime?: string | null;
  } = {},
) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: options.destinationCode ?? '440400',
      start_date: startDate,
      end_date: endDate,
      stops: options.stops ?? ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
      meeting_areas: options.meetingAreas ?? null,
      meeting_time: options.meetingTime ?? null,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

test('shows the identity gate with login form and the unfinished trip list', async ({ page }) => {
  await page.goto('/');

  // 68d17ae 后身份门只剩登录 / 注册表单，演示身份直选区块已移除。
  await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '注册' })).toBeVisible();
  await expect(page.getByLabel('用户名')).toBeVisible();
  await expect(page.locator('.gate-cards')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /林见夏|陈屿|苏念|周野/ })).toHaveCount(0);

  await loginAs(page, 1);
  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('今天想走哪条路');
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '佛山祖庙与岭南天地一日' })).toBeVisible();
  await expect(page.getByText('已满员').first()).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路摄影一日游' })).toHaveCount(0);
});

test('filters the list by interest tag and keeps the filters visible', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');

  await page.getByRole('checkbox', { name: '摄影', exact: true }).click();

  await expect(page.getByText('已应用筛选')).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '广州老城骑楼扫街半日' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '深圳大鹏半岛海岸线徒步' })).toHaveCount(0);

  await page.getByRole('button', { name: '清除全部条件' }).click();
  await expect(page.locator('.trip-card', { hasText: '深圳大鹏半岛海岸线徒步' })).toBeVisible();
});

test('publishes a trip and finds it in the home list', async ({ page }) => {
  const title = `E2E 周末骑行 ${Date.now()}`;
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await expect(page.getByRole('heading', { name: '基本信息' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '简单路线' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '同行与预算' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '兴趣标签' })).toBeVisible();
  await expect(page.getByLabel('出发日期')).toHaveValue(todayIso());
  await expect(page.getByLabel('结束日期')).toHaveValue(todayIso());
  await expect(page.locator('[data-testid="place-map"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="place-map"]').first()).toHaveAttribute(
    'data-city',
    'all',
  );
  await expect(page.getByText('未选目的地时显示全省地图；选定城市后地图会自动聚焦。')).toBeVisible();

  const cascader = page.locator('.area-trigger').first();
  const cascaderWidth = await cascader.evaluate((node) => node.getBoundingClientRect().width);
  const fieldWidth = await cascader.evaluate(
    (node) => node.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(Math.abs(cascaderWidth - fieldWidth)).toBeLessThanOrEqual(2);

  await page.getByLabel('标题').fill(title);
  await pickDestination(page, '广东省', '珠海市');

  const map = page.locator('[data-testid="place-map"]').first();
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-city', '珠海');
  await expect(map.getByRole('button', { name: /情侣路/ })).toBeVisible();
  await setDate(page, '出发日期', isoDaysFromToday(7));
  await setDate(page, '结束日期', isoDaysFromToday(7));
  await pickPlace(page, '途经点', '香洲港');
  await pickPlace(page, '途经点', '情侣路');
  await page.getByRole('checkbox', { name: '摄影', exact: true }).click();

  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page).toHaveURL(/#\/trips\/\d+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('珠海').first()).toBeVisible();
  await expect(page.getByText('招募中').first()).toBeVisible();
  await expect(page.getByText('这是你发布的行程')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('.trip-card', { hasText: title })).toBeVisible();
});

test('publishes with a meeting time and edits it from the detail page', async ({ page }) => {
  const title = `E2E 集合信息 ${Date.now()}`;
  const day = isoDaysFromToday(7);
  const [, month, date] = day.split('-').map(Number);
  const meetingLabel = `${month}/${date} 08:30`;
  const movedLabel = `${month}/${date} 09:00`;
  await loginAs(page, 1);
  await page.goto('/#/trips/new');
  await page.getByLabel('标题').fill(title);
  await pickDestination(page, '广东省', '珠海市');
  await setDate(page, '出发日期', day);
  await setDate(page, '结束日期', day);
  await pickPlace(page, '途经点', '香洲港');
  await pickPlace(page, '途经点', '情侣路');
  await page.getByLabel(/集合区域/).fill('香洲港客运站');
  await page.getByLabel(/集合区域/).press('Enter');
  await expect(page.locator('.place-chip-name', { hasText: '香洲港客运站' })).toBeVisible();
  await page.getByLabel(/集合时间/).fill(`${day}T08:30`);
  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.locator('.detail-facts')).toContainText('香洲港客运站');
  await expect(page.locator('.detail-facts')).toContainText(meetingLabel);

  await page.getByRole('button', { name: '编辑集合信息' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '移除 香洲港客运站' }).click();
  await dialog.getByLabel('集合区域').fill('香洲港新码头');
  await dialog.getByLabel('集合区域').press('Enter');
  await dialog.getByLabel('集合时间').fill(`${day}T09:00`);
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(page.getByText('集合信息已更新')).toBeVisible();
  await expect(page.locator('.detail-facts')).toContainText('香洲港新码头');
  await expect(page.locator('.detail-facts')).not.toContainText('香洲港客运站');
  await expect(page.locator('.detail-facts')).toContainText(movedLabel);
});

test('rejects a meeting time after the end date on the publish form', async ({ page }) => {
  const day = isoDaysFromToday(7);
  const laterDay = isoDaysFromToday(8);
  await loginAs(page, 1);
  await page.goto('/#/trips/new');
  await page.getByLabel('标题').fill(`E2E 集合校验 ${Date.now()}`);
  await pickDestination(page, '广东省', '珠海市');
  await setDate(page, '出发日期', day);
  await setDate(page, '结束日期', day);
  await pickPlace(page, '途经点', '香洲港');
  await pickPlace(page, '途经点', '情侣路');
  await page.getByLabel(/集合时间/).fill(`${laterDay}T08:30`);
  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page.getByText('集合时间不能晚于结束日期')).toBeVisible();
  await expect(page).toHaveURL(/#\/trips\/new/);
});

test('explains a destination without offline map coverage', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await pickDestinationByCode(page, '110000', '110100');

  await expect(page.locator('[data-testid="place-map"]')).toHaveCount(0);
  await expect(page.getByText('这个城市暂时没有离线点位')).toBeVisible();
  await expect(page.getByText('未选目的地时显示全省地图；选定城市后地图会自动聚焦。')).toHaveCount(0);
});

test('blocks publishing and flags every missing required field', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page).toHaveURL(/#\/trips\/new$/);
  await expect(page.getByLabel('标题')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#trip-destination')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('途经点')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('给这条路线起个名字（40 字以内）')).toBeVisible();
  await expect(page.getByText('请选择目的地')).toBeVisible();
  await expect(page.getByText('至少写出两个途经点，别人才看得懂路线')).toBeVisible();
});

test('publisher ends an ongoing trip and sees the experience section', async ({ page }) => {
  const title = `E2E 结束行程 ${Date.now()}`;
  const created = await createTripViaApi(page, title);
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('这是你发布的行程')).toBeVisible();
  await expect(page.getByText('旅行中').first()).toBeVisible();

  await page.locator('.detail-actions-primary').getByRole('button', { name: '结束行程' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /取\s*消/ }).click();
  await expect(page.getByText('旅行中').first()).toBeVisible();

  await page.locator('.detail-actions-primary').getByRole('button', { name: '结束行程' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '结束行程' }).click();

  await expect(page.getByText('已结束').first()).toBeVisible();
  await expect(page.getByText('游后真实体验')).toBeVisible();
  await expect(page.getByRole('button', { name: '结束行程' })).toHaveCount(0);
});

test('defaults to the recruiting trips view with complete cards', async ({ page }) => {
  const title = `E2E 默认卡片 ${Date.now()}`;
  await createTripViaApi(page, title, isoDaysFromToday(7), isoDaysFromToday(7));
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.getByRole('radiogroup', { name: '浏览视图' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '招募中的行程' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '旅行体验' })).not.toBeChecked();

  const card = page.locator('.trip-card', { hasText: title });
  await expect(card).toBeVisible();
  await expect(card.locator('.tc-title')).toHaveText(title);
  await expect(card.locator('.tc-dest')).toHaveText('珠海市');
  await expect(card.locator('.tc-meta')).toContainText(/周[一二三四五六日]出发/);
  await expect(card.locator('.tc-route')).toContainText('香洲港集合');
  await expect(card.locator('.tc-tags')).toContainText('摄影');
  await expect(card.locator('.tc-host-name')).toContainText('林见夏');
  await expect(card.locator('.tc-cap-num')).toHaveText('1 / 3 人');
  await expect(card.locator('[data-status="recruiting"]')).toContainText('招募中');
});

test('distinguishes full trips from recruiting trips without color alone', async ({ page }) => {
  const title = `E2E 招募卡片 ${Date.now()}`;
  await createTripViaApi(page, title, isoDaysFromToday(7), isoDaysFromToday(7));
  await loginAs(page, 1);
  await page.goto('/');
  await expandPageSize(page);

  const full = page.locator('.trip-card', { hasText: '佛山祖庙与岭南天地一日' });
  await expect(full.locator('[data-status="full"]')).toContainText('已满员');
  await expect(full.locator('[data-status-icon="full"]')).toBeVisible();
  await expect(full.locator('.tc-meter.is-full')).toBeVisible();
  await expect(full.locator('.tc-cap-num')).toHaveText('2 / 2 人');

  const recruiting = page.locator('.trip-card', { hasText: title });
  await expect(recruiting.locator('[data-status="recruiting"]')).toContainText('招募中');
  await expect(recruiting.locator('[data-status-icon="recruiting"]')).toBeVisible();
  await expect(recruiting.locator('.tc-meter.is-full')).toHaveCount(0);
});

test('keeps ended trips out of the default view', async ({ page }) => {
  const title = `E2E 未结束 ${Date.now()}`;
  await createTripViaApi(page, title, isoDaysFromToday(7), isoDaysFromToday(7));
  await loginAs(page, 1);
  await page.goto('/');

  await expect(page.locator('.trip-card', { hasText: title })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路摄影一日游' })).toHaveCount(0);
  await expect(page.locator('.trip-card', { hasText: '清远英西峰林两日露营' })).toHaveCount(0);
  await expect(page.locator('.trip-card [data-status="completed"]')).toHaveCount(0);
});

test('keeps out-of-scope actions off the screens', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/5');

  await expect(page.getByRole('button', { name: '提交同行申请' })).toBeVisible();
  await expect(page.getByRole('button', { name: '结束行程' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /编辑|删除|取消行程/ })).toHaveCount(0);

  await page.goto('/#/trips/9999');
  await expect(page.getByText('行程不存在')).toBeVisible();
});

test('filters by province and city without a search box', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/');
  await expandPageSize(page);

  await expect(page.getByPlaceholder('搜索路线、地点或发布者')).toHaveCount(0);
  await pickDestination(page, '广东省', '珠海市');

  await expect(page.getByText('已应用筛选')).toBeVisible();
  await expect(page.locator('.active-summary')).toContainText('广东省 / 珠海市');
  await expect(page.locator('.trip-card', { hasText: '珠海情侣路日落机位二刷' })).toBeVisible();
  await expect(page.locator('.trip-card', { hasText: '广州老城骑楼扫街半日' })).toHaveCount(0);

  await page.getByRole('button', { name: '清除全部条件' }).click();
  await expect(page.locator('.trip-card', { hasText: '广州老城骑楼扫街半日' })).toBeVisible();
});

test('map supports zoom, fullscreen, pin cards and click-to-add', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  const shell = page.locator('.map-shell').first();
  const map = shell.locator('[data-testid="place-map"]');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-city', 'all');
  const before = await map.getAttribute('viewBox');

  await shell.getByRole('button', { name: '放大地图' }).click();
  await expect.poll(async () => map.getAttribute('viewBox')).not.toBe(before);

  await shell.getByRole('button', { name: '全屏查看地图' }).click();
  await expect(shell).toHaveClass(/is-fullscreen/);
  await page.keyboard.press('Escape');
  await expect(shell).not.toHaveClass(/is-fullscreen/);

  await pickDestination(page, '广东省', '珠海市');
  await expect(map).toHaveAttribute('data-city', '珠海');

  // 点击点位 pin：弹出地点卡并可加入路线（相邻 pin 命中圆重叠，用事件派发避免拦截）。
  await map.locator('[data-place-id="珠海-珠海渔女"]').dispatchEvent('click');
  const pinCallout = page.locator('.map-callout').first();
  await expect(pinCallout.locator('.map-callout-name')).toHaveText('珠海渔女');
  await pinCallout.getByRole('button', { name: '加入路线' }).click();
  await expect(page.locator('.place-chip-name', { hasText: '珠海渔女' })).toBeVisible();

  // 点击空白处：弹出附近候选浮层，同样可以加入路线。
  await shell.getByRole('button', { name: '回到当前范围' }).click();
  await shell.scrollIntoViewIfNeeded();
  const box = await map.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.03);
  const callout = page.locator('.map-callout').first();
  await expect(callout).toBeVisible();
  await expect(callout.locator('.map-callout-list')).toBeVisible();
  await callout.getByRole('button', { name: '加入路线' }).first().click();
  await expect(page.locator('.place-chip-name')).toHaveCount(2);
});

test('map pins add multiple stops and enforce the eight-stop limit', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');
  await pickDestination(page, '广东省', '珠海市');

  const shell = page.locator('.map-shell').first();
  const map = shell.locator('[data-testid="place-map"]');

  // 连续点选两个 pin 加入路线，编号水滴按顺序出现。
  await map.locator('[data-place-id="珠海-香洲港"]').dispatchEvent('click');
  await page.locator('.map-callout').getByRole('button', { name: '加入路线' }).click();
  await expect(page.locator('.place-chip-name', { hasText: '香洲港' })).toBeVisible();
  await shell.getByRole('button', { name: '回到当前范围' }).click();
  await map.locator('[data-place-id="珠海-情侣路"]').dispatchEvent('click');
  await page.locator('.map-callout').getByRole('button', { name: '加入路线' }).click();
  await expect(page.locator('.place-chip-name', { hasText: '情侣路' })).toBeVisible();
  await expect(map.locator('.map-pin.selected')).toHaveCount(2);
  await expect(map.locator('.map-selected-index').first()).toHaveText('1');

  // 其余途经点用搜索补齐到 8 个。
  for (const name of ['珠海渔女', '日月贝', '圆明新园', '外伶仃岛', '东澳岛', '港珠澳大桥']) {
    await pickPlace(page, '途经点', name);
  }
  await expect(page.locator('.place-chip-name')).toHaveCount(8);

  // 第 9 个被拒绝并给出上限提示。
  const input = page.getByLabel('途经点');
  await input.fill('珠海');
  await input.press('Enter');
  await expect(page.locator('.place-message')).toContainText('最多选择 8 个地点');
  await expect(page.locator('.place-chip-name')).toHaveCount(8);
});

test('province overview city clicks only focus and never write stops', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  const shell = page.locator('.map-shell').first();
  const map = shell.locator('[data-testid="place-map"]');
  await expect(map).toHaveAttribute('data-city', 'all');
  const before = await map.getAttribute('viewBox');

  // 空白点击的候选浮层提供「聚焦」，不写途经点（选海域空白处，避免命中 pin）。
  await shell.scrollIntoViewIfNeeded();
  const box = await map.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width * 0.85, box!.y + box!.height * 0.8);
  const callout = page.locator('.map-callout').first();
  await expect(callout).toContainText('附近候选');
  await callout.getByRole('button', { name: /聚\s*焦/ }).first().click();
  await expect(page.locator('.place-chip-name')).toHaveCount(0);
  await expect(shell.locator('.map-scope-card')).not.toContainText('广东全省');

  // 重置回全省视图后，直接点城市 pin 也只聚焦。
  await page.reload();
  await expect(map).toHaveAttribute('data-city', 'all');
  await map.locator('[data-place-id="广州-广州"]').dispatchEvent('click');
  await expect.poll(async () => map.getAttribute('viewBox')).not.toBe(before);
  await expect(shell.locator('.map-scope-card')).toContainText('广州');
  await expect(shell.locator('.map-scope-card')).toContainText('个可选地点');
  await expect(map).toHaveAttribute('data-city', 'all');
  await expect(page.locator('.place-chip-name')).toHaveCount(0);
});

test('publishes multiple meeting areas and adds a third from the edit dialog', async ({ page }) => {
  const title = `E2E 多集合区域 ${Date.now()}`;
  await loginAs(page, 1);
  await page.goto('/#/trips/new');
  await page.getByLabel('标题').fill(title);
  await pickDestination(page, '广东省', '珠海市');
  await pickPlace(page, '途经点', '香洲港');
  await pickPlace(page, '途经点', '情侣路');

  const draft = page.getByLabel(/集合区域/);
  await draft.fill('香洲港客运站');
  await draft.press('Enter');
  await draft.fill('情侣路驿站');
  await draft.press('Enter');
  await expect(page.locator('.place-chip-name', { hasText: '香洲港客运站' })).toBeVisible();
  await expect(page.locator('.place-chip-name', { hasText: '情侣路驿站' })).toBeVisible();
  await page.getByRole('button', { name: /^发\s*布$/ }).click();

  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.locator('.detail-facts')).toContainText('香洲港客运站、情侣路驿站');

  await page.getByRole('button', { name: '编辑集合信息' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.place-chip-name')).toHaveCount(2);
  await dialog.getByLabel('集合区域').fill('拱北口岸');
  await dialog.getByLabel('集合区域').press('Enter');
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(page.getByText('集合信息已更新')).toBeVisible();
  await expect(page.locator('.detail-facts')).toContainText('香洲港客运站、情侣路驿站、拱北口岸');
});

test('rejects a fourth meeting area and overlong area text on the publish form', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');

  const draft = page.getByLabel(/集合区域/);
  // 超长先于上限校验：空列表时 101 字被拒绝。
  await draft.fill('长'.repeat(101));
  await draft.press('Enter');
  await expect(page.getByText('集合区域最多 100 字')).toBeVisible();

  for (const area of ['甲集合点', '乙集合点', '丙集合点']) {
    await draft.fill(area);
    await draft.press('Enter');
  }
  await draft.fill('丁集合点');
  await draft.press('Enter');
  await expect(page.getByText('最多选择 3 个集合区域')).toBeVisible();
});

test('detail page renders the route map with numbered pins and a route strip', async ({ page }) => {
  const title = `E2E 路线地图 ${Date.now()}`;
  const created = await createTripViaApi(page, title, todayIso(), todayIso(), {
    destinationCode: '440100',
    stops: ['广州塔', '北京路', '陈家祠'],
  });
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  const section = page.locator('.detail-map-section');
  await expect(section).toBeVisible();
  const map = section.locator('[data-testid="place-map"]');
  await expect(map).toHaveAttribute('data-city', '广州');
  await expect(map.locator('.map-pin.selected')).toHaveCount(3);
  await expect(map.locator('.map-selected-index')).toHaveText(['1', '2', '3']);
  await expect(map.locator('.map-route-line')).toBeVisible();

  await expect(section.locator('.route-strip-card')).toHaveCount(3);
  await expect(section.locator('.route-strip-leg')).toHaveCount(2);
  await expect(section.locator('.route-strip-leg').first()).toContainText(/步行 约 .+ km/);
});

test('route strip click focuses the map and read-only pin cards carry no add action', async ({ page }) => {
  const title = `E2E 地图聚焦 ${Date.now()}`;
  const created = await createTripViaApi(page, title, todayIso(), todayIso(), {
    destinationCode: '440100',
    stops: ['广州塔', '北京路', '陈家祠'],
  });
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  const map = page.locator('.detail-map-section [data-testid="place-map"]');
  const before = await map.getAttribute('viewBox');
  await page.locator('.route-strip-card').nth(1).click();
  await expect.poll(async () => map.getAttribute('viewBox')).not.toBe(before);

  await map.locator('[data-place-id="广州-北京路"]').dispatchEvent('click');
  const callout = page.locator('.map-callout').first();
  await expect(callout.locator('.map-callout-name')).toHaveText('北京路');
  await expect(callout.getByRole('button', { name: '加入路线' })).toHaveCount(0);
});

test('detail page degrades to text when stops are off the gazetteer', async ({ page }) => {
  const title = `E2E 地图降级 ${Date.now()}`;
  const created = await createTripViaApi(page, title);
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);

  await expect(page.locator('.detail-map-section')).toHaveCount(0);
  await expect(page.getByText('部分途经点不在地图地名库，路线地图未渲染。')).toBeVisible();
  await expect(page.locator('.detail-stops')).toContainText('香洲港集合');
});

test('meeting edit syncs multiple areas and the API guards limit and ownership', async ({ page }) => {
  const title = `E2E 集合守护 ${Date.now()}`;
  const created = await createTripViaApi(page, title, todayIso(), todayIso(), {
    meetingAreas: ['香洲港客运站', '情侣路驿站'],
  });
  await loginAs(page, 1);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.locator('.detail-facts')).toContainText('香洲港客运站、情侣路驿站');

  await page.getByRole('button', { name: '编辑集合信息' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.place-chip-name')).toHaveCount(2);
  await dialog.getByRole('button', { name: '移除 情侣路驿站' }).click();
  await dialog.getByLabel('集合区域').fill('拱北口岸');
  await dialog.getByLabel('集合区域').press('Enter');
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(page.getByText('集合信息已更新')).toBeVisible();
  await expect(page.locator('.detail-facts')).toContainText('香洲港客运站、拱北口岸');

  const tooMany = await page.request.put(`${API}/trips/${created.id}/meeting`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: { meeting_areas: ['一', '二', '三', '四'], meeting_time: null },
  });
  expect(tooMany.status()).toBe(400);

  const notPublisher = await page.request.put(`${API}/trips/${created.id}/meeting`, {
    headers: { 'X-User-Id': '2', 'Content-Type': 'application/json' },
    data: { meeting_areas: ['别人的集合点'], meeting_time: null },
  });
  expect(notPublisher.status()).toBe(403);
});

test('legacy single meeting area is backfilled and shown on the detail page', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/7');

  await expect(page.getByRole('heading', { name: '上海武康路咖啡散步' })).toBeVisible();
  await expect(page.locator('.detail-facts')).toContainText('武康大楼正门');
});

test.describe('date pickers under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('opens the publish and home date panels instead of rendering them off-screen', async ({
    page,
  }) => {
    await loginAs(page, 1);
    await page.goto('/#/trips/new');

    await page.getByLabel('出发日期').click();
    const publishPanel = page.locator('.app-date-popup');
    await expect(publishPanel).toBeVisible();
    const publishBox = await publishPanel.boundingBox();
    expect(publishBox).not.toBeNull();
    expect(publishBox!.x).toBeGreaterThanOrEqual(0);
    expect(publishBox!.y).toBeGreaterThanOrEqual(0);
    expect(publishBox!.x).toBeLessThan(1280);

    await page.getByRole('button', { name: '今天' }).click();
    await expect(publishPanel).toBeHidden();
    await expect(page.getByLabel('出发日期')).toHaveValue(todayIso());

    await page.goto('/');
    await page.getByLabel('出发不早于').click();
    await expect(page.locator('.app-date-popup')).toBeVisible();
  });
});