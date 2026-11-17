import { describe, expect, it } from 'vitest';
import {
  canGenerate,
  emptyPlannerForm,
  toGenerateRequest,
  yuanToCents,
  type PlannerFormValues,
} from './plannerForm';

const place = (name: string, lng: number, lat: number) => ({ name, lng, lat });

const filled: PlannerFormValues = {
  origin: place('广州南站', 113.269, 22.989),
  destination: place('广州市', 113.264, 23.129),
  date: '2026-11-21',
  duration: 'one_day',
  budgetYuan: '500',
  travelMode: 'transit',
  interests: ['美食', '摄影', 'City Walk'],
  pace: 'moderate',
};

describe('canGenerate', () => {
  it('requires origin, destination and date together', () => {
    expect(canGenerate(filled)).toBe(true);
    expect(canGenerate({ ...filled, origin: null })).toBe(false);
    expect(canGenerate({ ...filled, destination: null })).toBe(false);
    expect(canGenerate({ ...filled, date: '' })).toBe(false);
  });

  it('rejects places without a name', () => {
    expect(canGenerate({ ...filled, origin: place('', 113.269, 22.989) })).toBe(false);
    expect(canGenerate({ ...filled, destination: place('  ', 113.264, 23.129) })).toBe(false);
  });

  it('does not require the optional conditions', () => {
    expect(
      canGenerate({
        ...filled,
        budgetYuan: '',
        interests: [],
      }),
    ).toBe(true);
  });
});

describe('emptyPlannerForm', () => {
  it('starts with the documented defaults', () => {
    expect(emptyPlannerForm).toEqual({
      origin: null,
      destination: null,
      date: '',
      duration: 'one_day',
      budgetYuan: '',
      travelMode: 'transit',
      interests: [],
      pace: 'moderate',
    });
  });
});

describe('toGenerateRequest', () => {
  it('maps form values onto the generate contract', () => {
    expect(toGenerateRequest(filled)).toEqual({
      origin: { name: '广州南站', lng: 113.269, lat: 22.989 },
      destination: { name: '广州市', lng: 113.264, lat: 23.129 },
      date: '2026-11-21',
      duration: 'one_day',
      budget_cents: 50000,
      travel_mode: 'transit',
      interests: ['美食', '摄影', 'City Walk'],
      pace: 'moderate',
      reduce_budget: false,
    });
  });

  it('passes reduce_budget through for the budget-lowering action', () => {
    expect(toGenerateRequest(filled, true).reduce_budget).toBe(true);
  });

  it('keeps optional fields nullable', () => {
    const request = toGenerateRequest({ ...filled, budgetYuan: '', interests: [] });
    expect(request.budget_cents).toBeNull();
    expect(request.interests).toEqual([]);
  });

  it('maps every duration / mode / pace option', () => {
    expect(toGenerateRequest({ ...filled, duration: 'half_day' }).duration).toBe('half_day');
    expect(toGenerateRequest({ ...filled, duration: 'two_day' }).duration).toBe('two_day');
    expect(toGenerateRequest({ ...filled, travelMode: 'walking' }).travel_mode).toBe('walking');
    expect(toGenerateRequest({ ...filled, travelMode: 'driving' }).travel_mode).toBe('driving');
    expect(toGenerateRequest({ ...filled, pace: 'relaxed' }).pace).toBe('relaxed');
    expect(toGenerateRequest({ ...filled, pace: 'compact' }).pace).toBe('compact');
  });
});

describe('yuanToCents', () => {
  it('converts yuan text to integer cents', () => {
    expect(yuanToCents('500')).toBe(50000);
    expect(yuanToCents('0.5')).toBe(50);
    expect(yuanToCents(' 460 ')).toBe(46000);
  });

  it('returns null for blank, invalid or non-positive input', () => {
    expect(yuanToCents('')).toBeNull();
    expect(yuanToCents('abc')).toBeNull();
    expect(yuanToCents('-5')).toBeNull();
    expect(yuanToCents('0')).toBeNull();
  });
});