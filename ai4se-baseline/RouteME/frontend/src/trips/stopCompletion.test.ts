import { describe, expect, it } from 'vitest';
import { allChecked, toggleIndex } from './stopCompletion';

describe('allChecked', () => {
  it('returns every stop index in order', () => {
    expect(allChecked(['香洲港集合', '情侣路骑行', '日月贝'])).toEqual([0, 1, 2]);
  });

  it('returns empty for no stops', () => {
    expect(allChecked([])).toEqual([]);
  });
});

describe('toggleIndex', () => {
  it('removes a checked index', () => {
    expect(toggleIndex([0, 1, 2], 1)).toEqual([0, 2]);
  });

  it('adds an unchecked index keeping ascending order', () => {
    expect(toggleIndex([0, 2], 1)).toEqual([0, 1, 2]);
  });

  it('does not mutate the input array', () => {
    const checked = [0, 1];
    toggleIndex(checked, 0);
    expect(checked).toEqual([0, 1]);
  });

  it('supports unchecking everything', () => {
    expect(toggleIndex(toggleIndex([0, 1], 0), 1)).toEqual([]);
  });
});