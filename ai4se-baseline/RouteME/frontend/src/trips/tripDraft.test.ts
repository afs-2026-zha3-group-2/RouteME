import { describe, expect, it } from 'vitest';
import { emptyTripForm, initialTripForm } from './tripForm';
import { parseTripDraft } from './tripDraft';

describe('parseTripDraft', () => {
  it('returns null for missing or malformed payloads', () => {
    expect(parseTripDraft(null)).toBeNull();
    expect(parseTripDraft('')).toBeNull();
    expect(parseTripDraft('not json')).toBeNull();
    expect(parseTripDraft('{}')).toBeNull();
    expect(parseTripDraft(JSON.stringify({ values: { stops: 'nope' } }))).toBeNull();
  });

  it('restores the saved form values', () => {
    const values = {
      ...initialTripForm(),
      title: '珠海海岸一日游',
      destinationCode: '440400',
      stops: ['香洲港', '情侣路'],
      travelMode: 'driving' as const,
      tags: ['美食'],
      capacity: '6',
    };
    const draft = parseTripDraft(JSON.stringify({ values, savedAt: '2026-11-17T10:00:00.000Z' }));
    expect(draft?.savedAt).toBe('2026-11-17T10:00:00.000Z');
    expect(draft?.values).toEqual(values);
  });

  it('falls back to empty values for unknown fields and invalid travel modes', () => {
    const draft = parseTripDraft(
      JSON.stringify({
        values: { ...emptyTripForm, travelMode: 'teleport', stops: [], tags: [], meetingAreas: [] },
        savedAt: 42,
      }),
    );
    expect(draft?.values.travelMode).toBe(emptyTripForm.travelMode);
    expect(draft?.values.title).toBe('');
    expect(draft?.savedAt).toBe('');
  });
});