import { describe, expect, it } from 'vitest';
import { matchCompanions, topCompanionMatch } from './companions';
import { MOCK_COMPANIONS } from './mockCompanions';

describe('companion matching', () => {
  const route = ['广州塔', '海心沙', '花城广场', '北京路步行街'];

  it('shows the mock summary for the acceptance route', () => {
    const matches = matchCompanions(route, MOCK_COMPANIONS);
    expect(matches).toHaveLength(3);
    expect(topCompanionMatch(matches)).toEqual({ percent: 85, count: 3 });
    expect(matches[0].matchedStops).toEqual(route);
  });

  it('narrows the percentage when the current route shares fewer stops', () => {
    const matches = matchCompanions(['广州塔', '海心沙'], MOCK_COMPANIONS);
    const linyi = matches.find((match) => match.id === 'companion-linyi');
    expect(linyi?.matchedStops).toEqual(['广州塔', '海心沙']);
    expect(linyi?.percent).toBe(43);
  });

  it('hides companions without a shared stop', () => {
    expect(matchCompanions(['成都大熊猫基地'], MOCK_COMPANIONS)).toEqual([]);
  });

  it('matches AMap POI names that extend the mock stop name', () => {
    const matches = matchCompanions(
      ['广州塔', '海心沙亚运公园', '花城广场', '北京路步行街'],
      MOCK_COMPANIONS,
    );
    expect(topCompanionMatch(matches)).toEqual({ percent: 85, count: 3 });
    expect(matches[0].matchedStops).toEqual(['广州塔', '海心沙亚运公园', '花城广场', '北京路步行街']);
  });
});