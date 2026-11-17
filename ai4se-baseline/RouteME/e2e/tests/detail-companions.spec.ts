import { expect, test, type Page } from '@playwright/test';
import {
  API,
  acceptApplicationViaApi,
  applyViaApi,
  createTripViaApi,
  loginAs,
  switchUser,
} from './support';

async function registerSparseCompanion(page: Page): Promise<{ id: number; nickname: string }> {
  const suffix = Date.now();
  const nickname = `空资料${suffix}`;
  const response = await page.request.post(`${API}/auth/register`, {
    data: {
      username: `sparse_${suffix}`,
      password: 'sparse-pass-123',
      nickname,
    },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as { user: { id: number } };
  return { id: session.user.id, nickname };
}

async function joinCompanions(page: Page, tripId: number, memberIds: number[]) {
  for (const memberId of memberIds) {
    await applyViaApi(page, memberId, tripId);
    await acceptApplicationViaApi(page, 2, tripId, memberId);
  }
}

test('keeps the participants payload unchanged for the detail page', async ({ page }) => {
  const created = await createTripViaApi(page, 2, `E2E 同行者契约 ${Date.now()}`, { capacity: 4 });
  await joinCompanions(page, created.id, [1]);

  const response = await page.request.get(`${API}/trips/${created.id}`, {
    headers: { 'X-User-Id': '2' },
  });
  expect(response.ok()).toBeTruthy();
  const trip = (await response.json()) as {
    publisher: { id: number };
    joined_count: number;
    participants: Array<Record<string, unknown>>;
  };

  expect(trip.participants[0].id).toBe(trip.publisher.id);
  expect(trip.participants).toHaveLength(2);
  expect(trip.joined_count).toBe(2);
  for (const participant of trip.participants) {
    expect(participant).toHaveProperty('nickname');
    expect(participant).toHaveProperty('avatar_initial');
    expect(participant).toHaveProperty('school');
    expect(participant).toHaveProperty('bio');
    expect(Array.isArray(participant.interests)).toBe(true);
  }
});

test('shows companion cards and keeps the publisher out of the list', async ({ page }) => {
  const created = await createTripViaApi(page, 2, `E2E 同行者卡片 ${Date.now()}`, { capacity: 4 });
  await joinCompanions(page, created.id, [1, 4]);

  await loginAs(page, 2);
  await page.goto(`/#/trips/${created.id}`);

  const list = page.locator('.detail-companions');
  await expect(list.locator('.companion-card')).toHaveCount(2);
  await expect(page.getByText('已加入 3/4人')).toBeVisible();

  const response = await page.request.get(`${API}/trips/${created.id}`, {
    headers: { 'X-User-Id': '2' },
  });
  const trip = (await response.json()) as {
    publisher: { id: number };
    participants: Array<{ id: number; nickname: string }>;
  };
  const expectedNames = trip.participants
    .filter((member) => member.id !== trip.publisher.id)
    .map((member) => member.nickname);
  const renderedNames = await list.locator('.companion-card .publisher-name').allTextContents();
  expect(renderedNames).toHaveLength(expectedNames.length);
  expectedNames.forEach((name, index) => {
    expect(renderedNames[index]).toContain(name);
  });

  await expect(page.getByRole('button', { name: '查看 陈屿 的资料' })).toHaveCount(1);
  await expect(page.locator('.publisher-name', { hasText: '陈屿' })).toHaveCount(1);
  await expect(list.locator('.companion-card .avatar.lg')).toHaveCount(2);
});

test('falls back to job or nickname when profile fields are missing', async ({ page }) => {
  const created = await createTripViaApi(page, 2, `E2E 同行者回退 ${Date.now()}`, { capacity: 4 });
  const sparse = await registerSparseCompanion(page);
  await joinCompanions(page, created.id, [4, sparse.id]);

  await loginAs(page, 2);
  await page.goto(`/#/trips/${created.id}`);

  const zhouye = page.locator('.companion-card', { hasText: '周野' });
  await expect(zhouye.locator('.publisher-name')).toHaveText('周野 · 产品经理');
  await expect(zhouye.locator('.publisher-bio')).not.toHaveText('');
  await expect(zhouye.locator('.tag').first()).toBeVisible();

  const sparseCard = page.locator('.companion-card', { hasText: sparse.nickname });
  await expect(sparseCard.locator('.publisher-name')).toHaveText(sparse.nickname);
  await expect(sparseCard.locator('.publisher-bio')).toHaveCount(0);
  await expect(sparseCard.locator('.tag')).toHaveCount(0);
  await expect(sparseCard.getByText('undefined')).toHaveCount(0);
});

test('renders a readable empty state when only the publisher joined', async ({ page }) => {
  const created = await createTripViaApi(page, 2, `E2E 同行者空态 ${Date.now()}`, { capacity: 3 });

  await loginAs(page, 3);
  await page.goto(`/#/trips/${created.id}`);

  await expect(page.locator('.detail-companions-empty')).toHaveText('还没有其他同行者。');
  await expect(page.locator('.companion-card')).toHaveCount(0);
  await expect(page.locator('.detail-companions')).toHaveCount(0);
});

test('opens a companion profile without leaving the detail page', async ({ page }) => {
  const created = await createTripViaApi(page, 2, `E2E 同行者资料 ${Date.now()}`, { capacity: 4 });
  await joinCompanions(page, created.id, [1]);

  await loginAs(page, 2);
  await page.goto(`/#/trips/${created.id}`);
  await page.getByRole('button', { name: '查看 林见夏 的资料' }).click();

  const modal = page.locator('.ant-modal', { hasText: '旅行者资料' });
  await expect(modal).toBeVisible();
  await expect(modal.getByText('林见夏', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#/trips/${created.id}$`));

  await modal.locator('.ant-modal-footer button').click();
  await expect(modal).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`#/trips/${created.id}$`));
});

test('shows the chat entry to the publisher and companions but not to outsiders', async ({ page }) => {
  const created = await createTripViaApi(page, 2, `E2E 同行者聊天 ${Date.now()}`, { capacity: 4 });
  await joinCompanions(page, created.id, [1, 4]);

  await loginAs(page, 2);
  await page.goto(`/#/trips/${created.id}`);
  await expect(page.locator('.detail-companions .companion-chat')).toHaveCount(2);

  await switchUser(page, 1);
  await expect(page.locator('.detail-companions .companion-chat')).toHaveCount(1);
  await expect(
    page.locator('.companion-card', { hasText: '林见夏' }).locator('.companion-chat'),
  ).toHaveCount(0);
  await expect(
    page.locator('.companion-card', { hasText: '周野' }).locator('.companion-chat'),
  ).toHaveCount(1);

  await switchUser(page, 3);
  await expect(page.locator('.detail-companions .companion-chat')).toHaveCount(0);
});

test('keeps companion cards inside the viewport at every breakpoint', async ({ page }) => {
  const created = await createTripViaApi(page, 2, `E2E 同行者响应式 ${Date.now()}`, { capacity: 4 });
  await joinCompanions(page, created.id, [1, 4]);

  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAs(page, 2);
  await page.goto(`/#/trips/${created.id}`);

  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('.detail-companions .companion-chat').first()).toBeVisible();
  }
});
