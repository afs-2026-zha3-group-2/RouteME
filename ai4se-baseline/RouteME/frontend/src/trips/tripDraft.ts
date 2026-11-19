/**
 * 发布页本机草稿：表单值 → localStorage（`routeme.tripDraft.v1`）。
 *
 * 只是浏览器本地暂存，不落库、不跨设备；解析失败即视为没有草稿。
 */
import { emptyTripForm, type TripFormValues } from './tripForm';

const DRAFT_KEY = 'routeme.tripDraft.v1';

export type TripDraft = {
  values: TripFormValues;
  savedAt: string;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return null;
  }
  return value as string[];
}

/** 反序列化：缺键用空表单补，类型不对整体作废（不半信半疑地恢复）。 */
export function parseTripDraft(raw: string | null): TripDraft | null {
  if (raw === null || raw.trim() === '') {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const values = record.values;
  if (typeof values !== 'object' || values === null) {
    return null;
  }
  const source = values as Record<string, unknown>;
  const stops = asStringArray(source.stops);
  const tags = asStringArray(source.tags);
  const meetingAreas = asStringArray(source.meetingAreas);
  if (stops === null || tags === null || meetingAreas === null) {
    return null;
  }
  const text = (key: keyof TripFormValues, fallback: string): string =>
    asString(source[key]) ?? fallback;
  const travelMode = asString(source.travelMode);
  return {
    values: {
      ...emptyTripForm,
      title: text('title', emptyTripForm.title),
      departureCode: text('departureCode', emptyTripForm.departureCode),
      destinationCode: text('destinationCode', emptyTripForm.destinationCode),
      startDate: text('startDate', emptyTripForm.startDate),
      endDate: text('endDate', emptyTripForm.endDate),
      stops,
      travelMode:
        travelMode === 'driving' || travelMode === 'bicycling' || travelMode === 'transit'
          ? travelMode
          : emptyTripForm.travelMode,
      capacity: text('capacity', emptyTripForm.capacity),
      meetingAreas,
      meetingTime: text('meetingTime', emptyTripForm.meetingTime),
      budgetMin: text('budgetMin', emptyTripForm.budgetMin),
      budgetMax: text('budgetMax', emptyTripForm.budgetMax),
      tags,
      note: text('note', emptyTripForm.note),
    },
    savedAt: asString(record.savedAt) ?? '',
  };
}

export function readTripDraft(storage: Storage | undefined = globalThis.localStorage): TripDraft | null {
  if (storage === undefined) {
    return null;
  }
  try {
    return parseTripDraft(storage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
}

export function writeTripDraft(
  values: TripFormValues,
  storage: Storage | undefined = globalThis.localStorage,
  now: Date = new Date(),
): TripDraft {
  const draft: TripDraft = { values, savedAt: now.toISOString() };
  if (storage !== undefined) {
    try {
      storage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // 隐私模式 / 配额满：草稿只是便利功能，失败不阻塞发布。
    }
  }
  return draft;
}

export function clearTripDraft(storage: Storage | undefined = globalThis.localStorage): void {
  if (storage === undefined) {
    return;
  }
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // 同上：清理失败不影响主流程。
  }
}