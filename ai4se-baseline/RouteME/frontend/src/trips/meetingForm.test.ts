import { describe, expect, it } from 'vitest';
import {
  addMeetingArea,
  emptyMeetingForm,
  meetingFormFrom,
  toMeetingRequest,
  validateMeetingForm,
} from './meetingForm';

describe('validateMeetingForm', () => {
  it('accepts empty and complete values', () => {
    expect(validateMeetingForm(emptyMeetingForm(), '2026-11-20')).toEqual({});
    expect(
      validateMeetingForm(
        { meetingAreas: ['陈家祠地铁站 D 口', '永庆坊'], meetingTime: '2026-11-20T08:30' },
        '2026-11-20',
      ),
    ).toEqual({});
  });

  it('rejects an area over 100 characters', () => {
    const errors = validateMeetingForm({ meetingAreas: ['区'.repeat(101)], meetingTime: '' }, '2026-11-20');
    expect(errors.meetingArea).toBeDefined();
  });

  it('rejects more than three areas', () => {
    const errors = validateMeetingForm(
      { meetingAreas: ['a', 'b', 'c', 'd'], meetingTime: '' },
      '2026-11-20',
    );
    expect(errors.meetingArea).toBeDefined();
  });

  it('rejects an unparsable meeting time', () => {
    const errors = validateMeetingForm({ meetingAreas: [], meetingTime: '2026-11-20 08:30' }, '2026-11-20');
    expect(errors.meetingTime).toBeDefined();
  });

  it('rejects a meeting time after the end date', () => {
    const errors = validateMeetingForm({ meetingAreas: [], meetingTime: '2026-11-21T08:30' }, '2026-11-20');
    expect(errors.meetingTime).toBeDefined();
  });

  it('allows the same calendar day as the end date', () => {
    expect(validateMeetingForm({ meetingAreas: [], meetingTime: '2026-11-20T23:59' }, '2026-11-20')).toEqual({});
  });
});

describe('addMeetingArea', () => {
  it('trims full-width spaces and keeps order', () => {
    const first = addMeetingArea([], '　陈家祠　');
    expect(first.next).toEqual(['陈家祠']);
    const second = addMeetingArea(first.next, '永庆坊');
    expect(second.next).toEqual(['陈家祠', '永庆坊']);
  });

  it('dedupes after trim', () => {
    const result = addMeetingArea(['陈家祠'], ' 陈家祠 ');
    expect(result.next).toEqual(['陈家祠']);
    expect(result.error).not.toBeNull();
  });

  it('enforces the three-area limit', () => {
    const result = addMeetingArea(['a', 'b', 'c'], 'd');
    expect(result.next).toEqual(['a', 'b', 'c']);
    expect(result.error).not.toBeNull();
  });

  it('rejects an over-long area', () => {
    const result = addMeetingArea([], '区'.repeat(101));
    expect(result.next).toEqual([]);
    expect(result.error).not.toBeNull();
  });
});

describe('meetingFormFrom', () => {
  it('maps nulls to empty list', () => {
    expect(meetingFormFrom({ meeting_areas: null, meeting_time: null })).toEqual({
      meetingAreas: [],
      meetingTime: '',
    });
    expect(meetingFormFrom({ meeting_areas: ['D 口'], meeting_time: '2026-11-20T08:30' })).toEqual({
      meetingAreas: ['D 口'],
      meetingTime: '2026-11-20T08:30',
    });
  });
});

describe('toMeetingRequest', () => {
  it('maps empty list to null so the pair is replaced', () => {
    expect(toMeetingRequest({ meetingAreas: [], meetingTime: '' })).toEqual({
      meeting_areas: null,
      meeting_time: null,
    });
    expect(toMeetingRequest({ meetingAreas: ['D 口'], meetingTime: ' 2026-11-20T08:30 ' })).toEqual({
      meeting_areas: ['D 口'],
      meeting_time: '2026-11-20T08:30',
    });
  });
});