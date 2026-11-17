import { describe, expect, it } from 'vitest';
import {
  emptyExperienceDraft,
  hasExperienceErrors,
  intensityLabel,
  toExperienceRequest,
  validateExperience,
} from './experienceForm';

describe('validateExperience', () => {
  it('rejects content shorter than 10 characters', () => {
    expect(validateExperience({ ...emptyExperienceDraft, content: '太短', advice: '带水' }).content).toContain('10');
  });

  it('rejects content longer than 400 characters', () => {
    expect(validateExperience({ ...emptyExperienceDraft, content: '字'.repeat(401), advice: '带水' }).content)
      .toContain('400');
  });

  it('rejects blank advice and advice longer than 120 characters', () => {
    expect(validateExperience({ ...emptyExperienceDraft, content: '字'.repeat(10), advice: '   ' }).advice)
      .toBeTruthy();
    expect(validateExperience({ ...emptyExperienceDraft, content: '字'.repeat(10), advice: '字'.repeat(121) }).advice)
      .toBeTruthy();
  });

  it('accepts boundary values', () => {
    expect(
      hasExperienceErrors(
        validateExperience({ ...emptyExperienceDraft, content: '字'.repeat(10), advice: '带水' }),
      ),
    ).toBe(false);
    expect(
      hasExperienceErrors(
        validateExperience({ ...emptyExperienceDraft, content: '字'.repeat(400), advice: '字'.repeat(120) }),
      ),
    ).toBe(false);
  });
});

describe('toExperienceRequest', () => {
  it('trims content and advice while keeping the intensity', () => {
    expect(
      toExperienceRequest({
        content: ` ${'字'.repeat(10)} `,
        intensity: 'tiring',
        advice: ' 带水 ',
        photos: [],
      }),
    ).toEqual({
      content: '字'.repeat(10),
      intensity: 'tiring',
      advice: '带水',
      photo_ids: [],
    });
  });

  it('maps photos to ordered photo ids', () => {
    expect(
      toExperienceRequest({
        ...emptyExperienceDraft,
        content: '字'.repeat(10),
        advice: '带水',
        photos: [
          { id: 7, url: '/api/experience-photos/7' },
          { id: 9, url: '/api/experience-photos/9' },
        ],
      }).photo_ids,
    ).toEqual([7, 9]);
  });
});

describe('intensityLabel', () => {
  it('maps wire values to Chinese labels', () => {
    expect(intensityLabel('relaxed')).toBe('轻松');
    expect(intensityLabel('moderate')).toBe('适中');
    expect(intensityLabel('tiring')).toBe('较累');
  });
});