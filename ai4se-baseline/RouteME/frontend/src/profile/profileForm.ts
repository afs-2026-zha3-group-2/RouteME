import { tripMessages } from '../i18n/tripMessages';
import type { UserProfile, UserProfileUpdateRequest } from '../types';
import {
  GENDERS,
  JOB_OTHER,
  JOBS,
  MAX_BIO_LENGTH,
  MAX_CITY_LENGTH,
  MAX_INTEREST_LENGTH,
  MAX_INTERESTS,
  MAX_JOB_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_SCHOOL_LENGTH,
  MBTI_TYPES,
  MIN_BIRTHDAY,
  MIN_INTERESTS,
  TRAVEL_STYLES,
} from './profileOptions';

export type ProfileField =
  | 'nickname'
  | 'birthday'
  | 'gender'
  | 'city'
  | 'school'
  | 'major'
  | 'job'
  | 'mbti'
  | 'interests'
  | 'travel_style'
  | 'bio';

export type ProfileFormValues = {
  nickname: string;
  birthday: string;
  gender: string;
  city: string;
  school: string;
  major: string;
  job: string;
  mbti: string;
  interests: string[];
  travel_style: string;
  bio: string;
};

export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

/** 必填项顺序：与汇总提示「还有 N 项未完成」的列出顺序一致。 */
export const REQUIRED_FIELDS: readonly ProfileField[] = [
  'nickname',
  'birthday',
  'gender',
  'city',
  'interests',
  'travel_style',
];

export const FIELD_LABELS: Record<ProfileField, string> = {
  nickname: tripMessages.profileFieldNickname,
  birthday: tripMessages.profileFieldBirthday,
  gender: tripMessages.profileFieldGender,
  city: tripMessages.profileFieldCity,
  school: tripMessages.profileFieldSchool,
  major: tripMessages.profileFieldMajor,
  job: tripMessages.profileFieldJob,
  mbti: tripMessages.profileFieldMbti,
  interests: tripMessages.profileFieldInterests,
  travel_style: tripMessages.profileFieldTravelStyle,
  bio: tripMessages.profileFieldBio,
};

export const emptyProfileForm: ProfileFormValues = {
  nickname: '',
  birthday: '',
  gender: '',
  city: '',
  school: '',
  major: '',
  job: '',
  mbti: '',
  interests: [],
  travel_style: '',
  bio: '',
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 本地时区的今天，`YYYY-MM-DD`；生日上限与 `<input type="date">` 的 max 共用。 */
export function todayIso(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidBirthday(value: string, today: string = todayIso()): boolean {
  const match = DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }
  // 校验完格式与真实日期后，ISO 字符串可直接比较区间。
  return value >= MIN_BIRTHDAY && value <= today;
}

function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
  return (options as readonly string[]).includes(value);
}

/**
 * 职业一栏用「预设下拉 + 其他自填」表达，但只落一个字段：
 * 预设值直接对应选项，其余文本都算「其他」的自填内容。
 */
export function jobSelection(job: string): { choice: string; custom: string } {
  if (job === '' || isOneOf(JOBS, job)) {
    return { choice: job, custom: '' };
  }
  return { choice: JOB_OTHER, custom: job };
}

/** 下拉与自填文本合成保存值；选「其他」但没填文本时仍存「其他」。 */
export function jobFromSelection(choice: string, custom: string): string {
  if (choice !== JOB_OTHER) {
    return choice;
  }
  return custom.trim() === '' ? JOB_OTHER : custom;
}

export function validateProfileForm(
  values: ProfileFormValues,
  today: string = todayIso(),
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  const nickname = values.nickname.trim();
  if (nickname === '' || nickname.length > MAX_NICKNAME_LENGTH) {
    errors.nickname = tripMessages.profileErrorNickname;
  }

  const birthday = values.birthday.trim();
  if (birthday === '' || !isValidBirthday(birthday, today)) {
    errors.birthday = tripMessages.profileErrorBirthday;
  }

  if (values.gender === '') {
    errors.gender = tripMessages.profileErrorGender;
  } else if (!isOneOf(GENDERS, values.gender)) {
    errors.gender = tripMessages.profileErrorOption;
  }

  const city = values.city.trim();
  if (city === '' || city.length > MAX_CITY_LENGTH) {
    errors.city = tripMessages.profileErrorCity;
  }

  const interests = values.interests.map((interest) => interest.trim());
  if (interests.length < MIN_INTERESTS || interests.length > MAX_INTERESTS) {
    errors.interests = tripMessages.profileErrorInterests;
  } else if (interests.some((interest) => interest === '')) {
    errors.interests = tripMessages.profileErrorInterests;
  } else if (interests.some((interest) => interest.length > MAX_INTEREST_LENGTH)) {
    errors.interests = tripMessages.profileErrorInterestsLength;
  } else if (new Set(interests).size !== interests.length) {
    errors.interests = tripMessages.profileErrorInterestsDuplicate;
  }

  if (values.travel_style === '') {
    errors.travel_style = tripMessages.profileErrorTravelStyle;
  } else if (!isOneOf(TRAVEL_STYLES, values.travel_style)) {
    errors.travel_style = tripMessages.profileErrorOption;
  }

  if (values.school.trim().length > MAX_SCHOOL_LENGTH) {
    errors.school = tripMessages.profileErrorSchool;
  }
  if (values.major.trim().length > MAX_SCHOOL_LENGTH) {
    errors.major = tripMessages.profileErrorMajor;
  }
  if (values.bio.trim().length > MAX_BIO_LENGTH) {
    errors.bio = tripMessages.profileErrorBio;
  }
  if (values.job.trim().length > MAX_JOB_LENGTH) {
    errors.job = tripMessages.profileErrorJob;
  }
  if (values.mbti !== '' && !isOneOf(MBTI_TYPES, values.mbti)) {
    errors.mbti = tripMessages.profileErrorOption;
  }

  return errors;
}

/** 汇总提示：只列必填项，保持表单顺序。 */
export function missingFieldLabels(errors: ProfileFieldErrors): string[] {
  return REQUIRED_FIELDS.filter((field) => errors[field] !== undefined).map(
    (field) => FIELD_LABELS[field],
  );
}

const DEFAULT_MESSAGE: Record<ProfileField, string> = {
  nickname: tripMessages.profileErrorNickname,
  birthday: tripMessages.profileErrorBirthday,
  gender: tripMessages.profileErrorGender,
  city: tripMessages.profileErrorCity,
  school: tripMessages.profileErrorSchool,
  major: tripMessages.profileErrorMajor,
  job: tripMessages.profileErrorJob,
  mbti: tripMessages.profileErrorOption,
  interests: tripMessages.profileErrorInterests,
  travel_style: tripMessages.profileErrorTravelStyle,
  bio: tripMessages.profileErrorBio,
};

/** 把服务端 `fields` 原因码映射为字段文案；未知原因码退回该字段默认文案。 */
export function reasonMessage(field: ProfileField, reason: string): string {
  if (reason === 'TOO_LONG') {
    return field === 'interests' ? tripMessages.profileErrorInterestsLength : DEFAULT_MESSAGE[field];
  }
  if (reason === 'INVALID_DATE' || reason === 'OUT_OF_RANGE') {
    return tripMessages.profileErrorBirthday;
  }
  if (reason === 'TOO_FEW' || reason === 'TOO_MANY') {
    return tripMessages.profileErrorInterests;
  }
  if (reason === 'DUPLICATE') {
    return tripMessages.profileErrorInterestsDuplicate;
  }
  if (reason === 'INVALID_OPTION') {
    return tripMessages.profileErrorOption;
  }
  return DEFAULT_MESSAGE[field];
}

const KNOWN_FIELDS = new Set<string>(Object.keys(FIELD_LABELS));

/** 把契约返回的 `fields` 回填到表单错误，忽略未知字段。 */
export function fieldErrorsFromReasons(
  fields: Record<string, string> | undefined,
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  if (fields === undefined) {
    return errors;
  }
  for (const [field, reason] of Object.entries(fields)) {
    if (KNOWN_FIELDS.has(field)) {
      errors[field as ProfileField] = reasonMessage(field as ProfileField, reason);
    }
  }
  return errors;
}

export function toUpdateRequest(values: ProfileFormValues): UserProfileUpdateRequest {
  const optional = (raw: string): string | null => {
    const value = raw.trim();
    return value === '' ? null : value;
  };
  return {
    nickname: values.nickname.trim(),
    birthday: values.birthday.trim(),
    gender: values.gender,
    city: values.city.trim(),
    interests: values.interests.map((interest) => interest.trim()),
    travel_style: values.travel_style,
    school: optional(values.school),
    major: optional(values.major),
    job: optional(values.job),
    mbti: optional(values.mbti),
    bio: optional(values.bio),
  };
}

/** 用已保存的资料填充表单；缺省字段落为空串 / 空数组。 */
export function profileToForm(profile: UserProfile): ProfileFormValues {
  return {
    nickname: profile.nickname,
    birthday: profile.birthday ?? '',
    gender: profile.gender ?? '',
    city: profile.city ?? '',
    school: profile.school ?? '',
    major: profile.major ?? '',
    job: profile.job ?? '',
    mbti: profile.mbti ?? '',
    interests: profile.interests,
    travel_style: profile.travel_style ?? '',
    bio: profile.bio ?? '',
  };
}

export type InterestResult = {
  interests: string[];
  error: string | null;
};

/** 添加自定义兴趣：去重、长度与数量上限。取消后仍留在候选列表，可再次选择。 */
export function addInterest(interests: string[], raw: string): InterestResult {
  const tag = raw.trim();
  if (tag === '') {
    return { interests, error: tripMessages.profileErrorInterests };
  }
  if (interests.includes(tag)) {
    return { interests, error: tripMessages.profileErrorInterestsDuplicate };
  }
  if (tag.length > MAX_INTEREST_LENGTH) {
    return { interests, error: tripMessages.profileErrorInterestsLength };
  }
  if (interests.length >= MAX_INTERESTS) {
    return { interests, error: tripMessages.profileErrorInterests };
  }
  return { interests: [...interests, tag], error: null };
}

export function removeInterest(interests: string[], tag: string): string[] {
  return interests.filter((interest) => interest !== tag);
}