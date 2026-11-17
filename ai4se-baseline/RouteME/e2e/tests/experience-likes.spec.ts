import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './support';

const API = '/api';

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 用户 1 建一条当天行程并结束，再发一条体验；返回行程与体验 id。 */
async function createExperience(page: Page, content: string): Promise<{ tripId: number; experienceId: number }> {
  const created = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      title: `E2E 点赞行程 ${Date.now()}`,
      destination_code: '440400',
      start_date: todayIso(),
      end_date: todayIso(),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: 3,
    },
  });
  expect(created.ok()).toBeTruthy();
  const trip = (await created.json()) as { id: number };

  const completed = await page.request.post(`${API}/trips/${trip.id}/complete`, {
    headers: { 'X-User-Id': '1' },
  });
  expect(completed.ok()).toBeTruthy();

  const shared = await page.request.post(`${API}/trips/${trip.id}/experiences`, {
    headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
    data: {
      content,
      intensity: 'moderate',
      advice: '带一件防风外套，海边傍晚温差大。',
    },
  });
  expect(shared.ok()).toBeTruthy();
  const experience = (await shared.json()) as { id: number };
  return { tripId: trip.id, experienceId: experience.id };
}

async function likeCountOf(card: ReturnType<Page['locator']>): Promise<number> {
  const text = await card.locator('b').textContent();
  return Number(text ?? '0');
}

test('likes and unlikes an experience card on the home page', async ({ page }) => {
  const content = `首页点赞交互验证，路线平缓，日落前到海滨泳场刚好。${Date.now()}`;
  await createExperience(page, content);

  await loginAs(page, 2);
  await page.goto('/');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();

  const card = page.locator('.exp-card', { hasText: content });
  const like = card.locator('.exp-like');
  await expect(like).toBeVisible();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  const before = await likeCountOf(like);

  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(like.locator('b')).toHaveText(String(before + 1));

  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(like.locator('b')).toHaveText(String(before));
});

test('keeps the detail-page like after refresh and clears it again', async ({ page }) => {
  const content = `详情页点赞持久化验证，碎石段最累，但营地星空值得。${Date.now()}`;
  const { tripId } = await createExperience(page, content);

  await loginAs(page, 2);
  await page.goto(`/#/trips/${tripId}`);

  const item = page.locator('.experience-list li', { hasText: content });
  const like = item.locator('.exp-like');
  await expect(like).toBeVisible();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  const before = await likeCountOf(like);

  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(like.locator('b')).toHaveText(String(before + 1));

  await page.reload();
  const persisted = page.locator('.experience-list li', { hasText: content }).locator('.exp-like');
  await expect(persisted).toHaveAttribute('aria-pressed', 'true');
  await expect(persisted.locator('b')).toHaveText(String(before + 1));

  await persisted.click();
  await expect(persisted).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(
    page.locator('.experience-list li', { hasText: content }).locator('.exp-like'),
  ).toHaveAttribute('aria-pressed', 'false');
});

test('rolls back the optimistic like and warns when the request fails', async ({ page }) => {
  const content = `点赞失败回滚验证，风很大，记得带外套。${Date.now()}`;
  await createExperience(page, content);

  await page.route('**/api/experiences/*/likes', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR' }),
      });
      return;
    }
    await route.continue();
  });

  await loginAs(page, 2);
  await page.goto('/');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();

  const card = page.locator('.exp-card', { hasText: content });
  const like = card.locator('.exp-like');
  const before = await likeCountOf(like);

  await like.click();
  await expect(page.getByText('点赞失败，请稍后重试')).toBeVisible();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(like.locator('b')).toHaveText(String(before));
});
