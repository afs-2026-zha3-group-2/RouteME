import { describe, expect, it } from 'vitest';
import {
  emptyFilterState,
  hasActiveFilters,
  normalizeRange,
  toTripFilters,
  toggleTag,
} from './tripFilters';

describe('toTripFilters', () => {
  it('omits blank inputs from the request params', () => {
    expect(toTripFilters(emptyFilterState)).toEqual({
      q: undefined,
      destination: undefined,
      date_from: undefined,
      date_to: undefined,
      tags: undefined,
      sort: 'date',
    });
  });

  it('trims the keyword and keeps selected filters', () => {
    const filters = toTripFilters({
      ...emptyFilterState,
      q: '  海岸 ',
      destination: '珠海',
      tags: ['摄影'],
      sort: 'new',
    });
    expect(filters.q).toBe('海岸');
    expect(filters.destination).toBe('珠海');
    expect(filters.tags).toEqual(['摄影']);
    expect(filters.sort).toBe('new');
  });

  it('swaps an inverted date range', () => {
    expect(normalizeRange('2026-11-20', '2026-11-16')).toEqual(['2026-11-16', '2026-11-20']);
    expect(toTripFilters({ ...emptyFilterState, dateFrom: '2026-11-20', dateTo: '2026-11-16' })).toMatchObject({
      date_from: '2026-11-16',
      date_to: '2026-11-20',
    });
  });
});

describe('toggleTag', () => {
  it('adds a missing tag and removes an existing one', () => {
    expect(toggleTag(['摄影'], '海边')).toEqual(['摄影', '海边']);
    expect(toggleTag(['摄影', '海边'], '摄影')).toEqual(['海边']);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the default state and true once a filter changes', () => {
    expect(hasActiveFilters(emptyFilterState)).toBe(false);
    expect(hasActiveFilters({ ...emptyFilterState, tags: ['摄影'] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState, sort: 'new' })).toBe(true);
  });
});