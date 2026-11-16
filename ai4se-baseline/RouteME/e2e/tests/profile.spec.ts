import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';
const PASSWORD = 'profile-pass-123';

type Account = {
  username: string;
  nickname: string;
  token: string;
  userId: number;
};

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}

function uniqueUsername(prefix: string): string {
  return `${prefix}${uniqueSuffix()}`;
}

function uniqueNickname(prefix: string): string {
  return `${prefix}${uniqueSuffix()}`;
}

async function registerViaApi(
  page: Page,
  options: { prefix?: string; nickname?: string } = {},
): Promise<Account> {
  const username = uniqueUsername(options.prefix ?? 'p');
  const nickname = options.nickname ?? uniqueNickname('资料');
  const response = await page.request.post(`${API}/auth/register`, {
    data: { username, password: PASSWORD, nickname },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { token: string; user: { id: number } };
  return { username, nickname, token: session.token, userId: session.user.id };
}

/** 把会话写入 localStorage；演示身份传 token: null。 */
async function useAccount(page: Page, account: { userId: number; token: string | null }): Promise<void> {
  await page.addInitScript(
    ({ id, token }) => {
      window.localStorage.setItem('routeme.currentUserId', String(id));
      if (token === null) {
        window.localStorage.removeItem('routeme.authToken');
      } else {
        window.localStorage.setItem('routeme.authToken', token);
      }
    },
    { id: account.userId, token: account.token },
  );
  await page.goto('/');
}

async function completeProfileViaApi(
  page: Page,
  account: Account,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await page.request.put(`${API}/users/me/profile`, {
    headers: { Authorization: `Bearer ${account.token}` },
    data: {
      nickname: account.nickname,
      birthday: '2003-05-18',
      gender: '女',
      city: '广州',
      interests: ['摄影', '美食', '徒步'],
      travel_style: '深度游',
      school: '中山大学',
      major: '地理科学',
      job: '学生',
      ...overrides,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Record<string, unknown>;
}

async function createTripViaApi(page: Page, account: Account, title: string): Promise<number> {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(account.userId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: '2026-12-01',
      end_date: '2026-12-01',
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { id: number }).id;
}

/** 与页面相同的生日派生：周岁 + 星座。 */
function expectedAge(birthday: string): number {
  const born = new Date(`${birthday}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

async function openSetup(page: Page): Promise<void> {
  await page.goto('/#/profile/setup');
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await expect(page.locator('#profile-nickname')).toBeVisible();
}

async function pickGender(page: Page, gender: string): Promise<void> {
  await page
    .locator('.profile-field', { hasText: '性别' })
    .locator('.ant-radio-button-wrapper', { hasText: gender })
    .click();
}

async function pickTravelStyle(page: Page, style: string): Promise<void> {
  await page
    .locator('.profile-field', { hasText: '旅行方式' })
    .locator('.ant-radio-button-wrapper', { hasText: style })
    .click();
}

async function pickInterest(page: Page, label: string): Promise<void> {
  await page.locator('.interest-card', { hasText: label }).click();
}

async function fillCompleteProfile(page: Page): Promise<void> {
  await page.locator('#profile-birthday').fill('2003-05-18');
  await pickGender(page, '女');
  await page.locator('#profile-city').fill('广州');
  await page.locator('#profile-school').fill('中山大学');
  await page.locator('#profile-major').fill('地理科学');
  await pickInterest(page, '自然风景');
  await pickInterest(page, '文化历史');
  await pickInterest(page, '看展');
  await pickTravelStyle(page, '深度游');
}

test('registers and lands on the profile setup page', async ({ page }) => {
  const username = uniqueUsername('r');
  const nickname = uniqueNickname('新同学');

  await page.goto('/');
  await page.getByRole('tab', { name: '注册' }).click();
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill(PASSWORD);
  await page.getByLabel('昵称').fill(nickname);
  await page.getByRole('button', { name: '注册并进入' }).click();

  await expect(page).toHaveURL(/#\/profile\/setup$/);
  await expect(page.getByRole('heading', { name: '完善个人资料' })).toBeVisible();
  // 注册后无需再次输入用户名 / 密码；昵称已带入资料表单。
  await expect(page.getByLabel('用户名')).toHaveCount(0);
  await expect(page.getByLabel('密码')).toHaveCount(0);
  await expect(page.locator('#profile-nickname')).toHaveValue(nickname);
});

test('blocks the submit and names the missing required fields', async ({ page }) => {
  const account = await registerViaApi(page);
  await useAccount(page, account);
  await openSetup(page);

  let putCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes('/api/users/me/profile')) {
      putCount += 1;
    }
  });

  await page.locator('#profile-job').click();
  await page.locator('.ant-select-item-option', { hasText: '学生' }).click();
  await page.getByRole('button', { name: '保存资料' }).click();

  const summary = page.locator('.profile-summary');
  await expect(summary).toContainText('还有 5 项未完成');
  for (const field of ['生日', '性别', '所在城市', '旅行兴趣', '旅行方式']) {
    await expect(summary).toContainText(field);
  }
  expect(putCount).toBe(0);
});

test('saves a complete profile and opens the public profile', async ({ page }) => {
  const account = await registerViaApi(page);
  await useAccount(page, account);
  await openSetup(page);
  await fillCompleteProfile(page);

  await page.getByRole('button', { name: '保存资料' }).click();

  await expect(page).toHaveURL(new RegExp(`#/users/${account.userId}$`));
  await expect(page.getByRole('heading', { name: new RegExp(account.nickname) })).toBeVisible();
  await expect(page.locator('.profile-chips')).toContainText('中山大学 · 地理科学');
  await expect(page.getByText(`${expectedAge('2003-05-18')} 岁 · 金牛`)).toBeVisible();
  await expect(page.locator('.profile-chips')).toContainText('深度游');
  await expect(page.getByText('资料已完善')).toBeVisible();
});

test('skips setup and completes the profile later from mine', async ({ page }) => {
  const account = await registerViaApi(page);
  await useAccount(page, account);
  await openSetup(page);

  await page.getByRole('button', { name: '跳过，先去逛逛' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('今天想走哪条路');

  await page.goto('/#/mine');
  const mineCard = page.locator('.mine-profile-card');
  await expect(mineCard).toContainText('资料未完善');
  await mineCard.getByRole('link', { name: '完善资料' }).click();
  await expect(page).toHaveURL(/#\/profile\/setup$/);
  await expect(page.locator('#profile-nickname')).toBeVisible();

  await fillCompleteProfile(page);
  await page.getByRole('button', { name: '保存资料' }).click();
  await expect(page.locator('.profile-hero')).toContainText('资料已完善');

  await page.goto('/#/mine');
  await expect(page.locator('.mine-profile-card')).toContainText('中山大学 · 地理科学');
  await expect(
    page.locator('.mine-profile-card').getByRole('link', { name: '编辑资料' }),
  ).toBeVisible();
});

test('edits the profile and updates the public page', async ({ page }) => {
  const account = await registerViaApi(page);
  await completeProfileViaApi(page, account);
  await useAccount(page, account);

  await page.goto(`/#/users/${account.userId}`);
  await expect(page.locator('.profile-chips')).toContainText('深度游');

  await openSetup(page);
  await pickTravelStyle(page, '特种兵');
  await page.getByRole('button', { name: '保存资料' }).click();

  await expect(page).toHaveURL(new RegExp(`#/users/${account.userId}$`));
  await expect(page.locator('.profile-chips')).toContainText('特种兵');
  await expect(page.locator('.profile-chips')).not.toContainText('深度游');

  const response = await page.request.get(`${API}/users/${account.userId}/profile`, {
    headers: { 'X-User-Id': String(account.userId) },
  });
  const profile = (await response.json()) as { id: number; travel_style: string };
  expect(profile.id).toBe(account.userId);
  expect(profile.travel_style).toBe('特种兵');
});

test('opens a publisher profile from a trip card', async ({ page }) => {
  const publisher = await registerViaApi(page, { prefix: 'pub' });
  await completeProfileViaApi(page, publisher, {
    school: null,
    major: null,
    job: '上班族',
    city: '杭州',
    travel_style: '休闲游',
  });
  const title = `发布者入口 ${uniqueSuffix()}`;
  await createTripViaApi(page, publisher, title);

  const viewer = await registerViaApi(page, { prefix: 'view' });
  await useAccount(page, viewer);
  // 首页用目的地/日期筛选，已无搜索框；切到「最新发布」使新行程排在最前。
  await page.getByLabel('排序').selectOption('new');

  const card = page.locator('.trip-card', { hasText: title });
  await expect(card).toBeVisible();
  // 摘要回退：没有学校时显示职业，不留空行。
  await expect(card.locator('.tc-host-name')).toContainText('上班族');

  await card
    .getByRole('button', { name: `查看 ${publisher.nickname} 的资料` })
    .click();

  // 卡片入口打开公开资料弹窗（REQ-009），不离开当前页。
  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(modal.getByText(publisher.nickname, { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: /^关\s*闭$/ }).click();
  await expect(modal).toBeHidden();

  // 公开主页路由仍可用：直接访问能看到同一份资料。
  await page.goto(`/#/users/${publisher.userId}`);
  await expect(page.getByRole('heading', { name: new RegExp(publisher.nickname) })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑资料' })).toHaveCount(0);
  await expect(page.locator('.profile-chips')).toContainText('上班族');
});

test('shows an incomplete-profile notice instead of blank fields', async ({ page }) => {
  const publisher = await registerViaApi(page, { prefix: 'inc' });
  await createTripViaApi(page, publisher, `未完善资料 ${uniqueSuffix()}`);

  const viewer = await registerViaApi(page, { prefix: 'view' });
  await useAccount(page, viewer);
  await page.goto(`/#/users/${publisher.userId}`);

  await expect(page.getByText('该用户尚未完善资料')).toBeVisible();
  await expect(page.getByText('资料未完善').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp(publisher.nickname) })).toBeVisible();
  await expect(page.getByText('资料加载失败')).toHaveCount(0);
});

test('uploads an avatar and keeps the nickname initial when absent', async ({ page }) => {
  const account = await registerViaApi(page, { nickname: `阿澄${uniqueSuffix()}` });
  await completeProfileViaApi(page, account);
  await useAccount(page, account);

  await page.goto(`/#/users/${account.userId}`);
  const heroAvatar = page.locator('.profile-hero .avatar');
  await expect(heroAvatar).toBeVisible();
  await expect(heroAvatar).toHaveText('阿');
  await expect(heroAvatar.locator('img')).toHaveCount(0);

  await openSetup(page);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
    'base64',
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(page.locator('.profile-avatar .avatar-img')).toBeVisible();

  await page.goto(`/#/users/${account.userId}`);
  const uploaded = page.locator('.profile-hero .avatar-img');
  await expect(uploaded).toBeVisible();
  await expect(uploaded).toHaveAttribute('src', /\/api\/users\/\d+\/avatar\?v=/);
});

test('limits interests and keeps a single travel style', async ({ page }) => {
  const account = await registerViaApi(page);
  await useAccount(page, account);
  await openSetup(page);

  await pickInterest(page, '自然风景');
  await pickInterest(page, '文化历史');
  await pickInterest(page, '看展');

  const custom = page.getByLabel('自定义标签，例如：温泉');
  await custom.fill('温泉');
  await page.locator('.interest-add').click();
  await expect(page.locator('.interest-count')).toHaveText('4 / 5');

  await pickInterest(page, '美食');
  await expect(page.locator('.interest-count')).toHaveText('5 / 5');
  // 达到上限后第 6 个卡片不再新增，并提示「已达 5 个上限」。
  const sixth = page.locator('.interest-card', { hasText: '摄影' });
  await expect(sixth).toHaveAttribute('title', '已达 5 个上限');
  await sixth.click();
  await expect(page.locator('.interest-count')).toHaveText('5 / 5');
  await expect(sixth).toHaveAttribute('aria-pressed', 'false');

  // 取消自定义标签后仍保留为未选卡片，点击即可复选（E13）。
  const customCard = page.locator('.interest-card', { hasText: '温泉' });
  await customCard.click();
  await expect(page.locator('.interest-count')).toHaveText('4 / 5');
  await expect(customCard).toHaveAttribute('aria-pressed', 'false');
  await customCard.click();
  await expect(page.locator('.interest-count')).toHaveText('5 / 5');
  await expect(customCard).toHaveAttribute('aria-pressed', 'true');

  const styleField = page.locator('.profile-field', { hasText: '旅行方式' });
  await pickTravelStyle(page, '特种兵');
  await pickTravelStyle(page, '休闲游');
  await expect(
    styleField.locator('.ant-radio-button-wrapper', { hasText: '休闲游' }),
  ).toHaveClass(/ant-radio-button-wrapper-checked/);
  await expect(
    styleField.locator('.ant-radio-button-wrapper', { hasText: '特种兵' }),
  ).not.toHaveClass(/ant-radio-button-wrapper-checked/);
});

test('keeps demo identities read-only', async ({ page }) => {
  await useAccount(page, { userId: 1, token: null });

  await page.goto('/#/mine');
  const mineCard = page.locator('.mine-profile-card');
  await expect(mineCard).toBeVisible();
  await expect(mineCard.getByRole('link', { name: '完善资料' })).toHaveCount(0);
  await expect(mineCard.getByRole('link', { name: '编辑资料' })).toHaveCount(0);
  await expect(mineCard.getByRole('link', { name: '查看主页' })).toHaveCount(0);

  await page.goto('/#/profile/setup');
  await expect(page.getByText('演示身份不能编辑资料；登录后可以完善自己的资料。')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存资料' })).toHaveCount(0);

  await page.goto('/#/users/2');
  await expect(page.getByRole('button', { name: '编辑资料' })).toHaveCount(0);

  const response = await page.request.put(`${API}/users/me/profile`, {
    headers: { 'X-User-Id': '1' },
    data: {
      nickname: '林见夏',
      birthday: '2000-01-01',
      gender: '女',
      city: '广州',
      interests: ['摄影', '美食', '徒步'],
      travel_style: '休闲游',
    },
  });
  expect(response.status()).toBe(403);
});