import { describe, expect, it } from 'vitest';
import { routeCompletionLine } from './routeCompletionDisplay';

describe('routeCompletionLine', () => {
  it('renders the percent plus the good label', () => {
    expect(routeCompletionLine('good', 85)).toEqual({ text: '路线完成度 85% · 信誉良好', tone: 'is-good' });
  });

  it('renders only the percent for neutral', () => {
    expect(routeCompletionLine('neutral', 75)).toEqual({ text: '路线完成度 75%', tone: 'is-fair' });
  });

  it('renders the watch wording without judging the user', () => {
    const line = routeCompletionLine('watch', 55);

    expect(line).toEqual({ text: '路线完成度 55% · 请留意行程完成情况', tone: 'is-watch' });
    expect(line.text).not.toMatch(/骗子|危险用户|不可信/);
  });

  it('renders the dash instead of a percent when there is no experience', () => {
    expect(routeCompletionLine('insufficient', null)).toEqual({ text: '路线完成度 -', tone: 'is-muted' });
    expect(routeCompletionLine('insufficient', 85)).toEqual({ text: '路线完成度 -', tone: 'is-muted' });
  });

  it('degrades a missing or unknown state to the dash', () => {
    expect(routeCompletionLine(undefined, 85).text).toBe('路线完成度 -');
    expect(routeCompletionLine(null, 85).text).toBe('路线完成度 -');
    expect(routeCompletionLine('unknown', 85).text).toBe('路线完成度 -');
  });

  it('degrades a missing or out-of-range rate instead of inventing a percent', () => {
    expect(routeCompletionLine('good', undefined)).toEqual({ text: '路线完成度 -', tone: 'is-muted' });
    expect(routeCompletionLine('neutral', null).text).toBe('路线完成度 -');
    expect(routeCompletionLine('watch', -5).text).toBe('路线完成度 -');
    expect(routeCompletionLine('good', 101).text).toBe('路线完成度 -');
    expect(routeCompletionLine('good', Number.NaN).text).toBe('路线完成度 -');
  });

  it('formats fractional values as integers only', () => {
    expect(routeCompletionLine('neutral', 74.6)).toEqual({ text: '路线完成度 75%', tone: 'is-fair' });
  });
});
