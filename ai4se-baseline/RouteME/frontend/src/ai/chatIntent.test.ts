import { describe, expect, it } from 'vitest';
import {
  applyIntent,
  findCityInText,
  intentHasCondition,
  PLANNER_INSPIRATIONS,
  parseDateInText,
  parseOriginName,
  parsePlanIntent,
} from './chatIntent';
import { emptyPlannerForm } from './plannerForm';

describe('parsePlanIntent', () => {
  it('reads city, duration, budget, pace and interests from one sentence', () => {
    const intent = parsePlanIntent(
      '帮我规划一个珠海两天一夜的行程，偏向美食和拍照，预算在 500 元以内。',
    );
    expect(intent.destinationName).toBe('珠海');
    expect(intent.duration).toBe('two_day');
    expect(intent.budgetYuan).toBe('500');
    expect(intent.interests).toEqual(['美食', '摄影']);
    expect(intent.pace).toBeNull();
  });

  it('recognises a weekend as two days and a low budget cap', () => {
    const intent = parsePlanIntent('周末广州周边游，不超过 200 元');
    expect(intent.destinationName).toBe('广州');
    expect(intent.duration).toBe('two_day');
    expect(intent.budgetYuan).toBe('200');
  });

  it('detects travel mode and pace keywords', () => {
    const intent = parsePlanIntent('自驾去惠州，行程紧凑一点');
    expect(intent.destinationName).toBe('惠州');
    expect(intent.travelMode).toBe('driving');
    expect(intent.pace).toBe('compact');
  });

  it('keeps the city after 去/到 as the destination instead of the origin city', () => {
    const intent = parsePlanIntent('从北京出发去天津玩一天');
    expect(intent.originName).toBe('北京');
    expect(intent.destinationName).toBe('天津');
    expect(intent.duration).toBe('one_day');
  });

  it('reads the destination from a bare "A 到 B" sentence', () => {
    expect(parsePlanIntent('北京到天津一日游').destinationName).toBe('天津');
  });

  it('leaves every field open when the text has no condition', () => {
    const intent = parsePlanIntent('你好');
    expect(intent.destinationName).toBeNull();
    expect(intent.duration).toBeNull();
    expect(intent.budgetYuan).toBeNull();
    expect(intent.pace).toBeNull();
    expect(intent.travelMode).toBeNull();
    expect(intent.interests).toEqual([]);
    expect(intentHasCondition(intent)).toBe(false);
  });
});

describe('findCityInText', () => {
  it('prefers the earliest mention among equally long names', () => {
    expect(findCityInText('从佛山去广州')).toBe('佛山');
  });

  it('matches the longest city name', () => {
    expect(findCityInText('去张家界玩两天')).toBe('张家界');
  });
});

describe('parseDateInText', () => {
  const now = new Date(2026, 10, 18, 10, 0);

  it('resolves relative days from today', () => {
    expect(parseDateInText('今天出发', now)).toBe('2026-11-18');
    expect(parseDateInText('明天去', now)).toBe('2026-11-19');
    expect(parseDateInText('后天去', now)).toBe('2026-11-20');
    expect(parseDateInText('3 天后出发', now)).toBe('2026-11-21');
  });

  it('resolves month/day and iso dates', () => {
    expect(parseDateInText('11月20日去珠海', now)).toBe('2026-11-20');
    expect(parseDateInText('2026-12-01 出发', now)).toBe('2026-12-01');
  });

  it('never resolves a month/day mention to a date before today', () => {
    // 今天 2026-11-18：本月已过的 11 月 1 日按今天算，不顺延到明年。
    expect(parseDateInText('11月1日去珠海', now)).toBe('2026-11-18');
    expect(parseDateInText('1月5日去珠海', now)).toBe('2026-11-18');
  });

  it('resolves weekday and weekend mentions', () => {
    // 2026-11-18 是周三：本周六 = 11-21，下周六 = 11-28。
    expect(parseDateInText('本周六出发', now)).toBe('2026-11-21');
    expect(parseDateInText('下周六出发', now)).toBe('2026-11-28');
    expect(parseDateInText('周末去', now)).toBe('2026-11-21');
  });

  it('returns null when the text carries no date', () => {
    expect(parseDateInText('去珠海玩两天', now)).toBeNull();
  });
});

describe('PLANNER_INSPIRATIONS', () => {
  const now = new Date(2026, 10, 19, 10, 0);

  it('every demo prompt carries a complete set of conditions', () => {
    for (const suggestion of PLANNER_INSPIRATIONS) {
      const intent = parsePlanIntent(suggestion.text, now);
      expect(intent.destinationName, `${suggestion.id}: destination`).not.toBeNull();
      expect(intent.originName, `${suggestion.id}: origin`).not.toBeNull();
      expect(intent.date, `${suggestion.id}: date`).not.toBeNull();
      expect(intent.duration, `${suggestion.id}: duration`).not.toBeNull();
      expect(intent.budgetYuan, `${suggestion.id}: budget`).not.toBeNull();
      expect(intent.pace, `${suggestion.id}: pace`).not.toBeNull();
      expect(intent.travelMode, `${suggestion.id}: travel mode`).not.toBeNull();
      expect(intent.interests.length, `${suggestion.id}: interests`).toBeGreaterThan(0);
    }
  });

  it('never mistakes the origin for the destination', () => {
    for (const suggestion of PLANNER_INSPIRATIONS) {
      const intent = parsePlanIntent(suggestion.text, now);
      expect(intent.destinationName, `${suggestion.id}: destination differs from origin`).not.toBe(
        intent.originName,
      );
    }
  });

  it('keeps every demo prompt distinct so the chips do not collapse into one plan', () => {
    const texts = PLANNER_INSPIRATIONS.map((suggestion) => suggestion.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe('parseOriginName', () => {
  it('reads the place before 出发', () => {
    expect(parseOriginName('从广州南站出发去珠海')).toBe('广州南站');
    expect(parseOriginName('由佛山出发')).toBe('佛山');
  });

  it('returns null when no origin is stated', () => {
    expect(parseOriginName('珠海两天一夜')).toBeNull();
  });
});

describe('applyIntent', () => {
  const base = { ...emptyPlannerForm, destination: null };

  it('only overrides fields that the text mentions', () => {
    const merged = applyIntent(base, parsePlanIntent('预算 300 元'));
    expect(merged.budgetYuan).toBe('300');
    expect(merged.duration).toBe('one_day');
    expect(merged.pace).toBe('moderate');
    expect(merged.travelMode).toBe('transit');
  });

  it('unions interests without duplicates', () => {
    const merged = applyIntent(
      { ...base, interests: ['美食'], budgetYuan: '800' },
      { ...parsePlanIntent('美食和夜景'), budgetYuan: null },
    );
    expect(merged.interests).toEqual(['美食', '夜景']);
    expect(merged.budgetYuan).toBe('800');
  });

  it('uses the resolved destination only when the text names a city', () => {
    const place = { name: '珠海市', lng: 113.57, lat: 22.27 };
    expect(applyIntent(base, parsePlanIntent('两天一夜'), place).destination).toBeNull();
    expect(applyIntent(base, parsePlanIntent('珠海两天一夜'), place).destination).toEqual(place);
  });

  it('applies the parsed date only when the text mentions one', () => {
    const merged = applyIntent(base, parsePlanIntent('明天去珠海', new Date(2026, 10, 18)));
    expect(merged.date).toBe('2026-11-19');
    expect(applyIntent(base, parsePlanIntent('去珠海')).date).toBe(base.date);
  });
});