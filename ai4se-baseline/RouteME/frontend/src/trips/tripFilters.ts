import type { TripFilters } from '../types';

export type FilterState = {
  q: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  tags: string[];
  sort: 'match' | 'date' | 'new';
};

export const emptyFilterState: FilterState = {
  q: '',
  destination: '',
  dateFrom: '',
  dateTo: '',
  tags: [],
  sort: 'match',
};

export function normalizeRange(dateFrom: string, dateTo: string): [string, string] {
  if (dateFrom !== '' && dateTo !== '' && dateFrom > dateTo) {
    return [dateTo, dateFrom];
  }
  return [dateFrom, dateTo];
}

export function toTripFilters(state: FilterState): TripFilters {
  const [dateFrom, dateTo] = normalizeRange(state.dateFrom, state.dateTo);
  return {
    q: state.q.trim() === '' ? undefined : state.q.trim(),
    destination: state.destination === '' ? undefined : state.destination,
    date_from: dateFrom === '' ? undefined : dateFrom,
    date_to: dateTo === '' ? undefined : dateTo,
    tags: state.tags.length === 0 ? undefined : state.tags,
    sort: state.sort,
  };
}

export function hasActiveFilters(state: FilterState): boolean {
  return (
    state.q.trim() !== '' ||
    state.destination !== '' ||
    state.dateFrom !== '' ||
    state.dateTo !== '' ||
    state.tags.length > 0 ||
        state.sort !== 'match'
  );
}

export function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
}