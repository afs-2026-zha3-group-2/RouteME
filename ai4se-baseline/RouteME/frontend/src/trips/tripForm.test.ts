import { describe, expect, it } from 'vitest';
import {
  addTag,
  emptyTripForm,
  initialTripForm,
  toCreateRequest,
  todayIso,
  validateTripForm,
  type TripFormValues,
} from './tripForm';

const validForm: TripFormValues = {
  ...emptyTripForm,
  title: '广州老城骑楼扫街半日',
  destinationCode: '440100',
  startDate: '2026-11-20',
  endDate: '2026-11-20',
  stops: ['陈家祠地铁站集合', '永庆坊'],
  capacity: '4',
  travelMode: 'bicycling',
  meetingAreas: ['陈家祠地铁站 D 口'],
  meetingTime: '2026-11-20T08:30',
  budgetMin: '80',
  budgetMax: '150',
  tags: ['摄影', '历史'],
  note: '走街串巷为主。',
};

describe('validateTripForm', () => {
  it('accepts a complete form', () => {
    expect(validateTripForm(validForm)).toEqual({});
  });

  it('reports missing title, destination and dates', () => {
    const errors = validateTripForm({ ...emptyTripForm, capacity: '4' });
    expect(errors.title).toBeDefined();
    expect(errors.destination).toBeDefined();
    expect(errors.startDate).toBeDefined();
    expect(errors.endDate).toBeDefined();
  });

  it('reports every missing required field at once', () => {
    const errors = validateTripForm({ ...emptyTripForm, capacity: '' });
    expect(Object.keys(errors).sort()).toEqual([
      'capacity',
      'destination',
      'endDate',
      'startDate',
      'stops',
      'title',
    ]);
  });

  it('rejects a destination that is not a city-level code', () => {
    expect(validateTripForm({ ...validForm, destinationCode: '' }).destination).toBeDefined();
    expect(validateTripForm({ ...validForm, destinationCode: '440000' }).destination).toBeDefined();
    expect(validateTripForm({ ...validForm, destinationCode: '999999' }).destination).toBeDefined();
  });

  it('rejects a title over the contract limit', () => {
    const errors = validateTripForm({ ...validForm, title: '路'.repeat(41) });
    expect(errors.title).toBeDefined();
  });

  it('rejects an end date before the start date', () => {
    const errors = validateTripForm({ ...validForm, endDate: '2026-11-19' });
    expect(errors.endDate).toBeDefined();
  });

  it('requires at least two stops', () => {
    const errors = validateTripForm({ ...validForm, stops: ['只有一处'] });
    expect(errors.stops).toBeDefined();
    expect(validateTripForm({ ...validForm, stops: ['一处', '  '] }).stops).toBeDefined();
  });

  it('bounds the capacity to the contract range', () => {
    expect(validateTripForm({ ...validForm, capacity: '1' }).capacity).toBeDefined();
    expect(validateTripForm({ ...validForm, capacity: '13' }).capacity).toBeDefined();
      expect(validateTripForm({ ...validForm, capacity: '2.5' }).capacity).toBeDefined();
      expect(validateTripForm({ ...validForm, capacity: '2' }).capacity).toBeUndefined();
      expect(validateTripForm({ ...validForm, capacity: '12' }).capacity).toBeUndefined();
    });

  it('rejects an inverted budget range', () => {
    const errors = validateTripForm({ ...validForm, budgetMin: '200', budgetMax: '100' });
    expect(errors.budget).toBeDefined();
  });

  it('rejects more than five tags', () => {
    const errors = validateTripForm({ ...validForm, tags: ['摄影', '美食', '海边', '徒步', '露营', '历史'] });
    expect(errors.tags).toBeDefined();
  });

  it('rejects a meeting time after the end date', () => {
    const errors = validateTripForm({ ...validForm, meetingTime: '2026-11-21T08:30' });
    expect(errors.meetingTime).toBeDefined();
  });

  it('rejects an unparsable meeting time', () => {
    const errors = validateTripForm({ ...validForm, meetingTime: '2026-11-20 08:30' });
    expect(errors.meetingTime).toBeDefined();
  });

  it('rejects an area over 100 characters', () => {
    const errors = validateTripForm({ ...validForm, meetingAreas: ['区'.repeat(101)] });
    expect(errors.meetingArea).toBeDefined();
  });
});

describe('initialTripForm', () => {
  it('defaults both dates to today using the local calendar day', () => {
    const form = initialTripForm(new Date(2026, 10, 16, 0, 30));
    expect(form.startDate).toBe('2026-11-16');
    expect(form.endDate).toBe('2026-11-16');
  });

  it('formats local dates without shifting across UTC midnight', () => {
    expect(todayIso(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
    expect(todayIso(new Date(2026, 11, 31, 23, 55))).toBe('2026-12-31');
  });
});

describe('toCreateRequest', () => {
  it('maps the form to the contract payload with cents and nullable optionals', () => {
    const request = toCreateRequest(validForm);
    expect(request).toMatchObject({
      title: '广州老城骑楼扫街半日',
      destination_code: '440100',
      start_date: '2026-11-20',
      end_date: '2026-11-20',
      stops: ['陈家祠地铁站集合', '永庆坊'],
      travel_mode: 'bicycling',
      meeting_areas: ['陈家祠地铁站 D 口'],
      meeting_time: '2026-11-20T08:30',
      budget_min_cents: 8000,
      budget_max_cents: 15000,
      tags: ['摄影', '历史'],
      capacity: 4,
    });
  });

  it('maps blank optionals to null', () => {
    const request = toCreateRequest({ ...emptyTripForm, meetingAreas: [], meetingTime: '  ', budgetMin: '', note: '' });
    expect(request.meeting_areas).toBeNull();
    expect(request.meeting_time).toBeNull();
    expect(request.budget_min_cents).toBeNull();
    expect(request.note).toBeNull();
  });

  it('defaults the travel mode to public transport', () => {
    expect(emptyTripForm.travelMode).toBe('transit');
    expect(toCreateRequest(emptyTripForm).travel_mode).toBe('transit');
  });
});

describe('addTag', () => {
  it('adds a trimmed custom tag once', () => {
    expect(addTag(['摄影'], ' 夜市 ')).toEqual(['摄影', '夜市']);
    expect(addTag(['摄影', '夜市'], '夜市')).toEqual(['摄影', '夜市']);
    expect(addTag(['摄影'], '   ')).toEqual(['摄影']);
  });

  it('stops at five tags', () => {
    const full = ['一', '二', '三', '四', '五'];
    expect(addTag(full, '六')).toEqual(full);
  });
});