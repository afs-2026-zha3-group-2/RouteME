import { cityByCode } from '../areas/areaCatalog';
import { tripMessages } from '../i18n/tripMessages';
import type { TripCreateRequest } from '../types';
import { MAX_CAPACITY, MAX_TAGS, MAX_TITLE_LENGTH, MIN_CAPACITY, MIN_STOPS } from './tripOptions';

export type TripFormValues = {
  title: string;
  destinationCode: string;
  startDate: string;
  endDate: string;
  stops: string[];
  capacity: string;
  meetingArea: string;
  budgetMin: string;
  budgetMax: string;
  tags: string[];
  note: string;
};

export type TripFieldErrors = Partial<Record<'title' | 'destination' | 'startDate' | 'endDate' | 'stops'
  | 'capacity' | 'budget' | 'tags', string>>;

export const emptyTripForm: TripFormValues = {
  title: '',
  destinationCode: '',
  startDate: '',
  endDate: '',
  stops: [],
  capacity: '4',
  meetingArea: '',
  budgetMin: '',
  budgetMax: '',
  tags: [],
  note: '',
};

export function validateTripForm(values: TripFormValues): TripFieldErrors {
  const errors: TripFieldErrors = {};
  const title = values.title.trim();
  if (title === '' || title.length > MAX_TITLE_LENGTH) {
    errors.title = tripMessages.errorTitleRequired;
  }
  if (cityByCode(values.destinationCode) === undefined) {
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
  }
  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
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
  return errors;
}

export function toCreateRequest(values: TripFormValues): TripCreateRequest {
  return {
    title: values.title.trim(),
    destination_code: values.destinationCode,
    start_date: values.startDate,
    end_date: values.endDate,
    stops: values.stops.map((stop) => stop.trim()).filter((stop) => stop !== ''),
    meeting_area: blankToNull(values.meetingArea),
    note: blankToNull(values.note),
    budget_min_cents: toCents(values.budgetMin),
    budget_max_cents: toCents(values.budgetMax),
    tags: values.tags,
    capacity: Number(values.capacity),
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