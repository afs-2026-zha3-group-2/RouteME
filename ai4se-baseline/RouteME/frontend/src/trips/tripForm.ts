import { findCity } from '../area/areaOptions';
import { tripMessages } from '../i18n/tripMessages';
import { isCoordinatePlaceholderName } from '../map/amap/placePick';
import type { TripCreateRequest, TripTravelMode } from '../types';
import { validateMeetingForm } from './meetingForm';
import {
  DEFAULT_DIFFICULTY,
  MAX_CAPACITY,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  MIN_CAPACITY,
  MIN_STOPS,
} from './tripOptions';

export type TripFormValues = {
  title: string;
  departureCode: string;
  destinationCode: string;
  startDate: string;
  endDate: string;
  stops: string[];
  travelMode: TripTravelMode;
  capacity: string;
  meetingAreas: string[];
  meetingTime: string;
  budgetMin: string;
  budgetMax: string;
  tags: string[];
  note: string;
};

export type TripFieldErrors = Partial<Record<'title' | 'destination' | 'startDate' | 'endDate' | 'stops'
  | 'capacity' | 'budget' | 'tags' | 'meetingArea' | 'meetingTime', string>>;

export const emptyTripForm: TripFormValues = {
  title: '',
  departureCode: '',
  destinationCode: '',
  startDate: '',
  endDate: '',
  stops: [],
  travelMode: 'transit',
  capacity: '4',
  meetingAreas: [],
  meetingTime: '',
  budgetMin: '',
  budgetMax: '',
  tags: [],
  note: '',
};

/** 新发布表单的默认集合时间：与出发日期同一天，08:30 只是可改的默认值。 */
export const DEFAULT_MEETING_TIME = '08:30';

/** Local calendar day as `yyyy-mm-dd`; `toISOString` would shift around UTC midnight. */
export function todayIso(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Publish form starts on today's date (including meeting time); users can still change every field. */
export function initialTripForm(now: Date = new Date()): TripFormValues {
  const today = todayIso(now);
  return {
    ...emptyTripForm,
    startDate: today,
    endDate: today,
    meetingTime: `${today}T${DEFAULT_MEETING_TIME}`,
    // 同行设置的默认难度也要真的进标签，否则下拉框会显示一个并未提交的值。
    tags: [DEFAULT_DIFFICULTY],
  };
}

export function validateTripForm(values: TripFormValues): TripFieldErrors {
  const errors: TripFieldErrors = {};
  const title = values.title.trim();
  if (title === '' || title.length > MAX_TITLE_LENGTH) {
    errors.title = tripMessages.errorTitleRequired;
  }
  if (findCity(values.destinationCode) === undefined) {
    errors.destination = tripMessages.errorDestinationRequired;
  }
  if (values.startDate === '') {
    errors.startDate = tripMessages.errorStartDateRequired;
  }
  if (values.endDate === '') {
    errors.endDate = tripMessages.errorEndDateRequired;
  }
  if (values.startDate !== '' && values.endDate !== '' && values.endDate < values.startDate) {
    errors.endDate = tripMessages.errorDateOrder;
  }
  if (values.stops.filter((stop) => stop.trim() !== '').length < MIN_STOPS) {
    errors.stops = tripMessages.errorStopsRequired;
  } else if (values.stops.some((stop) => isCoordinatePlaceholderName(stop))) {
    // 地图点选兜底：坐标占位名在加入时就该改名，这里拦住预填 / 草稿等旁路。
    errors.stops = tripMessages.errorStopsPlaceholder;
  }
  // 空值只可能是「参考此行程发布」未预填人数，提示去选，而不是笼统报范围。
  const capacity = Number(values.capacity);
  if (values.capacity.trim() === '') {
    errors.capacity = tripMessages.errorCapacityRequired;
  } else if (!Number.isInteger(capacity) || capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
    errors.capacity = tripMessages.errorCapacityRange;
  }
  const budgetMin = parseYuan(values.budgetMin);
  const budgetMax = parseYuan(values.budgetMax);
  if ((budgetMin !== null && budgetMin < 0) || (budgetMax !== null && budgetMax < 0)) {
    errors.budget = tripMessages.errorBudgetOrder;
  } else if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    errors.budget = tripMessages.errorBudgetOrder;
  }
  if (values.tags.length > MAX_TAGS) {
    errors.tags = tripMessages.errorTagsLimit;
  }
  const meetingErrors = validateMeetingForm(
    { meetingAreas: values.meetingAreas, meetingTime: values.meetingTime },
    values.endDate,
  );
  if (meetingErrors.meetingArea !== undefined) {
    errors.meetingArea = meetingErrors.meetingArea;
  }
  if (meetingErrors.meetingTime !== undefined) {
    errors.meetingTime = meetingErrors.meetingTime;
  }
  return errors;
}

/** aiItineraryId 非空时携带 AI 快照链接（后端校验归属）；普通发布不带该键。 */
export function toCreateRequest(values: TripFormValues, aiItineraryId?: number): TripCreateRequest {
  return {
    title: values.title.trim(),
    departure_code: blankToNull(values.departureCode),
    destination_code: values.destinationCode.trim(),
    start_date: values.startDate,
    end_date: values.endDate,
    stops: values.stops.map((stop) => stop.trim()).filter((stop) => stop !== ''),
    travel_mode: values.travelMode,
    meeting_areas: values.meetingAreas.length > 0 ? values.meetingAreas : null,
    meeting_time: blankToNull(values.meetingTime),
    note: blankToNull(values.note),
    budget_min_cents: toCents(values.budgetMin),
    budget_max_cents: toCents(values.budgetMax),
    tags: values.tags,
    capacity: Number(values.capacity),
    ...(aiItineraryId !== undefined ? { ai_itinerary_id: aiItineraryId } : {}),
  };
}

/** Adds a custom interest tag, keeping order, uniqueness and the count limit. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = raw.trim();
  if (tag === '' || tags.includes(tag) || tags.length >= MAX_TAGS) {
    return tags;
  }
  return [...tags, tag];
}

function parseYuan(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCents(value: string): number | null {
  const yuan = parseYuan(value);
  return yuan === null ? null : Math.round(yuan * 100);
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}