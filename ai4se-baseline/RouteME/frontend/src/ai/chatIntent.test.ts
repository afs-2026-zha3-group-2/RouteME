import { describe, expect, it } from 'vitest';
import {
  applyIntent,
  findCityInText,
  intentHasCondition,
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
    expect(intent.travelMode).toBe('driving');
    expect(intent.pace).toBe('compact');
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
});