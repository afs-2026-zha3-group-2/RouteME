import { expect, test, type Page } from '@playwright/test';
import { API, createTripViaApi, loginAs } from './support';
import {
  experiencePhotoJpeg,
  experiencePhotoJpegThird,
  experiencePhotoPng,
  type PhotoFixture,
} from '../fixtures/experiencePhotos';

async function createCompletedTrip(page: Page, title: string) {
  const trip = await createTripViaApi(page, 1, title, { daysFromToday: 0 });
  const completed = await page.request.post(`${API}/trips/${trip.id}/complete`, {
    headers: { 'X-User-Id': '1' },
  });
  expect(completed.ok()).toBeTruthy();
  return trip;
}

async function uploadPhoto(page: Page, tripId: number, fixture: PhotoFixture) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`${API}/trips/${tripId}/experiences/photos`) &&
      response.request().method() === 'POST',
  );
  await page.locator('input[type="file"]').setInputFiles(fixture);
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number; url: string };
}

test('上传体验图片并在详情页查看全部（体验图片 E1）', async ({ page }) => {
  const title = `E2E 体验图片 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
  const content = `这条线路带了两张照片记录，按上传顺序展示。${Date.now()}`;

  await loginAs(page, 1);
  await page.goto(`/#/share/${trip.id}`);
  await expect(page.locator('.photo-empty')).toContainText('还没有照片');

  const first = await uploadPhoto(page, trip.id, experiencePhotoJpeg);
  const second = await uploadPhoto(page, trip.id, experiencePhotoPng);
  await expect(page.locator('.photo-tile')).toHaveCount(2);
  await expect(page.locator('.photo-tile img').nth(0)).toHaveAttribute('src', first.url);
  await expect(page.locator('.photo-tile img').nth(1)).toHaveAttribute('src', second.url);
  await expect(page.locator('.photo-note')).toContainText('2/6');

  await page.getByPlaceholder(/路况、强度、时间点/).fill(content);
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('照片按顺序上传。');
  await page.getByRole('button', { name: '发布体验' }).click();

  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.locator('.experience-photos img')).toHaveAttribute('src', first.url);
  const viewAll = page.getByRole('button', { name: '查看全部 2 张' });
  await expect(viewAll).toBeVisible();
  await viewAll.click();
  await expect(page.locator('.ant-image-preview-img')).toHaveAttribute('src', first.url);
  await page.locator('.ant-image-preview-switch-next').click();
  await expect(page.locator('.ant-image-preview-img')).toHaveAttribute('src', second.url);
});

test('编辑体验时删除并重排图片（体验图片 E2）', async ({ page }) => {
  const title = `E2E 重排体验图片 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
  const content = `先按顺序上传三张，再删掉中间一张并把最后一张移到首位。${Date.now()}`;

  await loginAs(page, 1);
  await page.goto(`/#/share/${trip.id}`);
  const first = await uploadPhoto(page, trip.id, experiencePhotoJpeg);
  await uploadPhoto(page, trip.id, experiencePhotoPng);
  const third = await uploadPhoto(page, trip.id, experiencePhotoJpegThird);
  await expect(page.locator('.photo-tile')).toHaveCount(3);

  await page.getByPlaceholder(/路况、强度、时间点/).fill(content);
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('按顺序整理照片。');
  await page.getByRole('button', { name: '发布体验' }).click();
  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.getByRole('button', { name: '查看全部 3 张' })).toBeVisible();
  await expect(page.locator('.experience-photos img')).toHaveAttribute('src', first.url);

  await page.getByRole('button', { name: '修改我的体验' }).click();
  await expect(page.locator('.photo-tile')).toHaveCount(3);
  await page.locator('.photo-tile').nth(1).getByRole('button', { name: '移除' }).click();
  await expect(page.locator('.photo-tile')).toHaveCount(2);
  await page.locator('.photo-tile').nth(1).getByRole('button', { name: '上移' }).click();
  await expect(page.locator('.photo-tile img').nth(0)).toHaveAttribute('src', third.url);
  await page.getByRole('button', { name: '保存修改' }).click();

  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.locator('.experience-photos img')).toHaveAttribute('src', third.url);
  await expect(page.getByRole('button', { name: '查看全部 2 张' })).toBeVisible();

  await page.goto(`/#/share/${trip.id}`);
  await expect(page.locator('.photo-tile img').nth(0)).toHaveAttribute('src', third.url);
  await expect(page.locator('.photo-tile img').nth(1)).toHaveAttribute('src', first.url);
});

test('未提交图片可预览移除，提交失败后保留可重试（体验图片 E3）', async ({ page }) => {
  const title = `E2E 图片重试 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
  const content = `先上传两张，删一张再补一张，模拟提交失败后重试。${Date.now()}`;

  await loginAs(page, 1);
  await page.goto(`/#/share/${trip.id}`);
  await uploadPhoto(page, trip.id, experiencePhotoJpeg);
  const second = await uploadPhoto(page, trip.id, experiencePhotoPng);
  await expect(page.locator('.photo-tile')).toHaveCount(2);

  await page.locator('.photo-tile').nth(0).getByRole('button', { name: '移除' }).click();
  await expect(page.locator('.photo-tile')).toHaveCount(1);
  const replacement = await uploadPhoto(page, trip.id, experiencePhotoPng);
  await expect(page.locator('.photo-tile')).toHaveCount(2);
  await expect(page.locator('.photo-tile img').nth(0)).toHaveAttribute('src', second.url);

  await page.getByPlaceholder(/路况、强度、时间点/).fill(content);
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('失败后直接重试。');

  await page.route(`**${API}/trips/${trip.id}/experiences`, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'SERVER_ERROR' }),
    }),
  );
  await page.getByRole('button', { name: '发布体验' }).click();
  await expect(page.getByText('发布体验失败')).toBeVisible();
  await expect(page.locator('.photo-tile')).toHaveCount(2);
  await expect(page.locator('.photo-tile img').nth(0)).toHaveAttribute('src', second.url);
  await expect(page.locator('.photo-tile img').nth(1)).toHaveAttribute('src', replacement.url);

  await page.unroute(`**${API}/trips/${trip.id}/experiences`);
  await page.getByRole('button', { name: '发布体验' }).click();
  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  await expect(page.locator('.experience-photos img')).toHaveAttribute('src', second.url);
  await expect(page.getByRole('button', { name: '查看全部 2 张' })).toBeVisible();
});

test('非作者看不到体验图片入口（体验图片 E5）', async ({ page }) => {
  await loginAs(page, 3);
  await page.goto('/#/share/1');
  await expect(page.getByText('只有参加过的同行者才能发表体验')).toBeVisible();
  await expect(page.getByRole('button', { name: '添加照片' })).toHaveCount(0);
  await expect(page.locator('.photo-grid, .photo-empty')).toHaveCount(0);

  await page.goto('/#/trips/1');
  await expect(page.getByRole('button', { name: /发表游后体验|修改我的体验/ })).toHaveCount(0);
  await expect(page.locator('.experience-photos-more')).toHaveCount(0);
});

test('无图体验只显示文字，首页体验卡保持内置封面（体验图片 E4 / R4）', async ({ page }) => {
  const title = `E2E 无图体验 ${Date.now()}`;
  const trip = await createCompletedTrip(page, title);
  const content = `这次没有带图，只留下文字记录与建议。${Date.now()}`;

  await loginAs(page, 1);
  await page.goto(`/#/share/${trip.id}`);
  await expect(page.locator('.photo-empty')).toBeVisible();
  await page.getByPlaceholder(/路况、强度、时间点/).fill(content);
  await page.getByPlaceholder('例如：鞋一定要抓地，普通跑鞋会滑。').fill('纯文字也很好。');
  await page.getByRole('button', { name: '发布体验' }).click();

  await expect(page).toHaveURL(new RegExp(`#/trips/${trip.id}$`));
  const item = page.locator('.experience-list li', { hasText: content });
  await expect(item).toBeVisible();
  await expect(item.locator('.experience-photos')).toHaveCount(0);
  await expect(item.locator('img')).toHaveCount(0);

  await page.goto('/');
  await page.locator('.ant-segmented-item', { hasText: '旅行体验' }).click();
  const card = page.locator('.exp-card', { hasText: content });
  await expect(card).toBeVisible();
  await expect(card.locator('.exp-cover')).toBeVisible();
  await expect(card.locator('.experience-photos, .photo-grid, .photo-tile')).toHaveCount(0);
  await expect(card.locator('img[src*="experience-photos"]')).toHaveCount(0);
});

test('行程发布页与聊天页没有图片上传入口（体验图片 R1 / R2）', async ({ page }) => {
  await loginAs(page, 1);
  await page.goto('/#/trips/new');
  await expect(page.getByRole('heading', { name: '发布一条想走的路' })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /上传照片|添加照片|上传图片/ })).toHaveCount(0);

  await page.goto('/#/chat/4/3');
  await expect(page.locator('.chat-item').first()).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /上传照片|添加照片|上传图片/ })).toHaveCount(0);
});
