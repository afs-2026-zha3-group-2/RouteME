import { tripMessages } from '../i18n/tripMessages';
import type { ExperienceIntensity } from '../types';

export type ExperienceDraft = {
  content: string;
  intensity: ExperienceIntensity;
  advice: string;
};

export type ExperienceErrors = {
  content?: string;
  advice?: string;
};

export const MIN_CONTENT_LENGTH = 10;
export const MAX_CONTENT_LENGTH = 400;
export const MAX_ADVICE_LENGTH = 120;

export const emptyExperienceDraft: ExperienceDraft = {
  content: '',
  intensity: 'moderate',
  advice: '',
};

export const INTENSITY_OPTIONS: {
  value: ExperienceIntensity;
  label: string;
  description: string;
  tone: 'jade' | 'amber' | 'coral';
}[] = [
  { value: 'relaxed', label: tripMessages.intensityRelaxed, description: '走走停停，随时能坐下', tone: 'jade' },
  { value: 'moderate', label: tripMessages.intensityModerate, description: '正常步速，午后会累', tone: 'amber' },
  { value: 'tiring', label: tripMessages.intensityTiring, description: '需要体力和一双好鞋', tone: 'coral' },
];

export function intensityLabel(value: ExperienceIntensity): string {
  return INTENSITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function validateExperience(draft: ExperienceDraft): ExperienceErrors {
  const errors: ExperienceErrors = {};
  const content = draft.content.trim();
  if (content.length < MIN_CONTENT_LENGTH) {
      errors.content = tripMessages.experienceContentTooShort;
  } else if (content.length > MAX_CONTENT_LENGTH) {
      errors.content = tripMessages.experienceContentTooLong;
  }
  const advice = draft.advice.trim();
  if (advice.length === 0) {
      errors.advice = tripMessages.experienceAdviceRequired;
  } else if (advice.length > MAX_ADVICE_LENGTH) {
      errors.advice = tripMessages.experienceAdviceTooLong;
  }
  return errors;
}

export function hasExperienceErrors(errors: ExperienceErrors): boolean {
  return errors.content !== undefined || errors.advice !== undefined;
}

export function toExperienceRequest(draft: ExperienceDraft) {
  return {
    content: draft.content.trim(),
    intensity: draft.intensity,
    advice: draft.advice.trim(),
  };
}