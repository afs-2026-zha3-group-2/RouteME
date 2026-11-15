import { describe, expect, it } from 'vitest';
import {
  emptyTripForm,
  splitStops,
  toCreateRequest,
  validateTripForm,
  type TripFormValues,
} from './tripForm';

const validForm: TripFormValues = {
  ...emptyTripForm,
  title: '广州老城骑楼扫街半日',
  destination: '广州',
  startDate: '2026-11-20',
  endDate: '2026-11-20',
  stopsText: '陈家祠地铁站集合\n永庆坊',
  capacity: '4',
  meetingArea: '陈家祠地铁站 D 口',
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

  it('rejects a title over the contract limit', () => {
    const errors = validateTripForm({ ...validForm, title: '路'.repeat(41) });
    expect(errors.title).toBeDefined();
  });

  it('rejects an end date before the start date', () => {
    const errors = validateTripForm({ ...validForm, endDate: '2026-11-19' });
    expect(errors.endDate).toBeDefined();
  });

  it('requires at least two stops', () => {
    const errors = validateTripForm({ ...validForm, stopsText: '只有一处' });
    expect(errors.stops).toBeDefined();
  });

  it('bounds the capacity to the contract range', () => {
    expect(validateTripForm({ ...validForm, capacity: '1' }).capacity).toBeDefined();
    expect(validateTripForm({ ...validForm, capacity: '13' }).capacity).toBeDefined();
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
});

describe('toCreateRequest', () => {
  it('maps the form to the contract payload with cents and nullable optionals', () => {
    const request = toCreateRequest(validForm);
    expect(request).toMatchObject({
      title: '广州老城骑楼扫街半日',
      destination: '广州',
      start_date: '2026-11-20',
      end_date: '2026-11-20',
      stops: ['陈家祠地铁站集合', '永庆坊'],
      meeting_area: '陈家祠地铁站 D 口',
      budget_min_cents: 8000,
      budget_max_cents: 15000,
      tags: ['摄影', '历史'],
      capacity: 4,
    });
  });

  it('maps blank optionals to null', () => {
    const request = toCreateRequest({ ...emptyTripForm, meetingArea: '  ', budgetMin: '', note: '' });
    expect(request.meeting_area).toBeNull();
    expect(request.budget_min_cents).toBeNull();
    expect(request.note).toBeNull();
  });
});

describe('splitStops', () => {
  it('trims lines and drops blank ones', () => {
    expect(splitStops(' 集合 \n\n 终点 ')).toEqual(['集合', '终点']);
  });
});