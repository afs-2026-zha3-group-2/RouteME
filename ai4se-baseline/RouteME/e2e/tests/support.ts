import { expect, type Page } from '@playwright/test';

export const API = '/api';

export async function loginAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('routeme.currentUserId', String(id));
  }, userId);
}

export async function switchUser(page: Page, userId: number) {
  await loginAs(page, userId);
  await page.reload();
}

export function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): string {
  return isoDaysFromToday(0);
}

type CreateTripOptions = {
  capacity?: number;
  meeting?: { area?: string; time?: string };
  daysFromToday?: number;
};

export async function createTripViaApi(
  page: Page,
  publisherId: number,
  title: string,
  options: CreateTripOptions = {},
) {
  const response = await page.request.post(`${API}/trips`, {
    headers: { 'X-User-Id': String(publisherId), 'Content-Type': 'application/json' },
    data: {
      title,
      destination_code: '440400',
      start_date: isoDaysFromToday(options.daysFromToday ?? 0),
      end_date: isoDaysFromToday(options.daysFromToday ?? 0),
      stops: ['香洲港集合', '情侣路骑行'],
      tags: ['摄影'],
      capacity: options.capacity ?? 3,
      meeting_area: options.meeting?.area ?? null,
      meeting_time: options.meeting?.time ?? null,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

export async function applyViaApi(
  page: Page,
  userId: number,
  tripId: number,
  message: string | null = null,
) {
  const response = await page.request.post(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(userId), 'Content-Type': 'application/json' },
    data: { message },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

export async function acceptApplicationViaApi(
  page: Page,
  publisherId: number,
  tripId: number,
  applicantId: number,
) {
  const listResponse = await page.request.get(`${API}/trips/${tripId}/applications`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(listResponse.ok()).toBeTruthy();
  const applications = (await listResponse.json()) as { id: number; applicant: { id: number } }[];
  const target = applications.find((application) => application.applicant.id === applicantId);
  expect(target).toBeTruthy();
  const response = await page.request.post(`${API}/applications/${target!.id}/accept`, {
    headers: { 'X-User-Id': String(publisherId) },
  });
  expect(response.ok()).toBeTruthy();
}