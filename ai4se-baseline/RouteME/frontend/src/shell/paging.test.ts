import { describe, expect, it } from 'vitest';
import { pageWindow } from './paging';

describe('pageWindow', () => {
  it('returns every page when the list fits in a short bar', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('folds both sides around a middle page', () => {
    expect(pageWindow(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12]);
  });

  it('keeps three leading pages visible near the start', () => {
    expect(pageWindow(2, 12)).toEqual([1, 2, 3, 'gap', 12]);
  });

  it('keeps three trailing pages visible near the end', () => {
    expect(pageWindow(11, 12)).toEqual([1, 'gap', 10, 11, 12]);
  });

  it('returns an empty window when there is no page', () => {
    expect(pageWindow(1, 0)).toEqual([]);
    expect(pageWindow(1, Number.NaN)).toEqual([]);
  });
});