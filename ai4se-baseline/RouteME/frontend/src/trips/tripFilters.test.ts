import { describe, expect, it } from 'vitest';
import {
  describeFilters,
  emptyFilterState,
  hasActiveFilters,
  normalizeRange,
  toTripFilters,
  toggleTag,
} from './tripFilters';

describe('toTripFilters', () => {
  it('omits blank inputs from the request params', () => {
    expect(toTripFilters(emptyFilterState)).toEqual({
      destination_code: undefined,
      date_from: undefined,
      date_to: undefined,
      tags: undefined,
      sort: 'new',
    });
  });

  it('keeps selected filters', () => {
    const filters = toTripFilters({
      ...emptyFilterState,
      destinationCode: '440400',
      tags: ['摄影'],
      sort: 'new',
    });
    expect(filters.destination_code).toBe('440400');
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
    expect(hasActiveFilters({ ...emptyFilterState, sort: 'date' })).toBe(true);
  });
});

describe('describeFilters', () => {
  it('returns an empty summary for the default state', () => {
    expect(describeFilters(emptyFilterState)).toBe('');
  });

  it('lists every applied condition in a stable order', () => {
    const summary = describeFilters({
      ...emptyFilterState,
      destinationCode: '440400',
      dateFrom: '2026-11-16',
      dateTo: '2026-11-20',
      tags: ['摄影', '海边'],
      sort: 'date',
    });

    expect(summary).toBe(
      '目的地 广东省 / 珠海市 · 出发不早于 2026-11-16 · 出发不晚于 2026-11-20 · 兴趣 摄影 / 海边 · 按出发日期',
    );
  });
});