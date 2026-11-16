import { tripMessages } from '../i18n/tripMessages';
import type { AuthRegisterRequest } from '../types';

export type AuthMode = 'login' | 'register';

export type AuthFormValues = {
  username: string;
  password: string;
  nickname: string;
  school: string;
  bio: string;
  interests: string[];
};

export type AuthFieldErrors = Partial<
  Record<'username' | 'password' | 'nickname' | 'school' | 'bio' | 'interests', string>
>;

/** Suggested interests shown as clickable cards on the register form. */
export const PRESET_INTERESTS: readonly string[] = [
  '摄影',
  '海边',
  '美食',
  '徒步',
  '露营',
  '展览',
  '夜景',
  '骑行',
  '咖啡',
  '音乐',
  '建筑',
  '城市漫步',
];

export const MAX_INTERESTS = 5;
export const MAX_INTEREST_LENGTH = 12;

export const emptyAuthForm: AuthFormValues = {
  username: '',
  password: '',
  nickname: '',
  school: '',
  bio: '',
  interests: [],
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 64;
const MAX_NICKNAME = 20;
const MAX_SCHOOL = 80;
const MAX_BIO = 500;

export type InterestResult = {
  interests: string[];
  error: string | null;
};

/** Add a custom interest, enforcing duplicate, length and count limits. */
export function addInterest(interests: string[], raw: string): InterestResult {
  const tag = raw.trim();
  if (tag === '') {
    return { interests, error: tripMessages.authErrorInterestEmpty };
  }
  if (interests.includes(tag)) {
    return { interests, error: tripMessages.authErrorInterestDuplicate };
  }
  if (tag.length > MAX_INTEREST_LENGTH) {
    return { interests, error: tripMessages.authErrorInterestLength };
  }
  if (interests.length >= MAX_INTERESTS) {
    return { interests, error: tripMessages.authErrorInterestsCount };
  }
  return { interests: [...interests, tag], error: null };
}

export function removeInterest(interests: string[], tag: string): string[] {
  return interests.filter((interest) => interest !== tag);
}

export function validateAuthForm(mode: AuthMode, values: AuthFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const username = values.username.trim();
  if (username === '') {
    errors.username = tripMessages.authErrorUsernameRequired;
  } else if (mode === 'register' && !USERNAME_PATTERN.test(username)) {
    errors.username = tripMessages.authErrorUsernameFormat;
  }

  if (values.password === '') {
    errors.password = tripMessages.authErrorPasswordRequired;
  } else if (
    mode === 'register' &&
    (values.password.length < MIN_PASSWORD || values.password.length > MAX_PASSWORD)
  ) {
    errors.password = tripMessages.authErrorPasswordLength;
  }

  if (mode === 'register') {
    const nickname = values.nickname.trim();
    if (nickname === '' || nickname.length > MAX_NICKNAME) {
      errors.nickname = tripMessages.authErrorNickname;
    }
    const school = values.school.trim();
    if (school === '' || school.length > MAX_SCHOOL) {
      errors.school = tripMessages.authErrorSchool;
    }
    if (values.bio.trim().length > MAX_BIO) {
      errors.bio = tripMessages.authErrorBio;
    }
    if (values.interests.length > MAX_INTERESTS) {
      errors.interests = tripMessages.authErrorInterestsCount;
    } else if (values.interests.some((interest) => interest.trim() === '')) {
      errors.interests = tripMessages.authErrorInterestEmpty;
    } else if (values.interests.some((interest) => interest.length > MAX_INTEREST_LENGTH)) {
      errors.interests = tripMessages.authErrorInterestLength;
    } else if (new Set(values.interests).size !== values.interests.length) {
      errors.interests = tripMessages.authErrorInterestDuplicate;
    }
  }
  return errors;
}

export function toRegisterRequest(values: AuthFormValues): AuthRegisterRequest {
  return {
    username: values.username.trim(),
    password: values.password,
    nickname: values.nickname.trim(),
    school: values.school.trim(),
    bio: values.bio.trim() === '' ? undefined : values.bio.trim(),
    interests: values.interests,
  };
}

/** Map contract error codes to readable Chinese copy. */
export function authErrorMessage(code: string): string {
  if (code === 'USERNAME_TAKEN') {
    return tripMessages.authErrorUsernameTaken;
  }
  if (code === 'INVALID_CREDENTIALS') {
    return tripMessages.authErrorInvalidCredentials;
  }
  if (code === 'SESSION_INVALID') {
    return tripMessages.authErrorSessionInvalid;
  }
  if (code === 'INVALID_INPUT') {
    return tripMessages.authErrorInvalidInput;
  }
  return `${tripMessages.authFailed}（${code}）`;
}