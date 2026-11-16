import { describe, expect, it } from 'vitest';
import { emptyMeetingForm, meetingFormFrom, toMeetingRequest, validateMeetingForm } from './meetingForm';

describe('validateMeetingForm', () => {
  it('accepts empty and complete values', () => {
    expect(validateMeetingForm(emptyMeetingForm(), '2026-11-20')).toEqual({});
    expect(
      validateMeetingForm({ meetingArea: '陈家祠地铁站 D 口', meetingTime: '2026-11-20T08:30' }, '2026-11-20'),
    ).toEqual({});
  });

  it('rejects an area over 100 characters', () => {
    const errors = validateMeetingForm({ meetingArea: '区'.repeat(101), meetingTime: '' }, '2026-11-20');
    expect(errors.meetingArea).toBeDefined();
  });

  it('rejects an unparsable meeting time', () => {
    const errors = validateMeetingForm({ meetingArea: '', meetingTime: '2026-11-20 08:30' }, '2026-11-20');
    expect(errors.meetingTime).toBeDefined();
  });

  it('rejects a meeting time after the end date', () => {
    const errors = validateMeetingForm({ meetingArea: '', meetingTime: '2026-11-21T08:30' }, '2026-11-20');
    expect(errors.meetingTime).toBeDefined();
  });

  it('allows the same calendar day as the end date', () => {
    expect(validateMeetingForm({ meetingArea: '', meetingTime: '2026-11-20T23:59' }, '2026-11-20')).toEqual({});
  });
});

describe('meetingFormFrom', () => {
  it('maps nulls to empty strings', () => {
    expect(meetingFormFrom({ meeting_area: null, meeting_time: null })).toEqual({ meetingArea: '', meetingTime: '' });
    expect(meetingFormFrom({ meeting_area: 'D 口', meeting_time: '2026-11-20T08:30' })).toEqual({
      meetingArea: 'D 口',
      meetingTime: '2026-11-20T08:30',
    });
  });
});

describe('toMeetingRequest', () => {
  it('maps blanks to null so the pair is replaced', () => {
    expect(toMeetingRequest({ meetingArea: '  ', meetingTime: '' })).toEqual({
      meeting_area: null,
      meeting_time: null,
    });
    expect(toMeetingRequest({ meetingArea: ' D 口 ', meetingTime: ' 2026-11-20T08:30 ' })).toEqual({
      meeting_area: 'D 口',
      meeting_time: '2026-11-20T08:30',
    });
  });
});
