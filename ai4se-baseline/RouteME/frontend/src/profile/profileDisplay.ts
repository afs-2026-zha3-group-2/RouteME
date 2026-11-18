import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser, UserProfile } from '../types';

export type PublisherFields = {
  school?: string | null;
  major?: string | null;
  job?: string | null;
  city?: string | null;
};

function text(value: string | null | undefined): string {
  return value === null || value === undefined ? '' : value.trim();
}

/** 「学校 · 专业」；没有学校时返回空串，用户不需要自己输入分隔符。 */
export function schoolMajor(fields: PublisherFields): string {
  const school = text(fields.school);
  if (school === '') {
    return '';
  }
  const major = text(fields.major);
  return major === '' ? school : `${school} · ${major}`;
}

/** 发布者摘要回退：学校 · 专业 → 职业 → 城市 → 空串。 */
export function publisherSummary(fields: PublisherFields): string {
  return schoolMajor(fields) || text(fields.job) || text(fields.city) || '';
}

/** 除昵称与头像外是否还有可展示的资料内容。 */
export function hasPublicContent(profile: UserProfile): boolean {
  return (
    text(profile.avatar_url) !== '' ||
    profile.interests.length > 0 ||
    text(profile.school) !== '' ||
    text(profile.major) !== '' ||
    text(profile.job) !== '' ||
    text(profile.city) !== '' ||
    text(profile.gender) !== '' ||
    text(profile.mbti) !== '' ||
    text(profile.travel_style) !== '' ||
    text(profile.bio) !== '' ||
    profile.student_verified ||
    (profile.age !== null && profile.age !== undefined)
  );
}

/** 「25 岁 · 双子座」；缺少任一派生值时不展示。 */
export function ageZodiacLabel(profile: Pick<UserProfile, 'age' | 'zodiac'>): string {
  if (profile.age === null || profile.age === undefined || text(profile.zodiac) === '') {
    return '';
  }
  return `${profile.age} ${tripMessages.profileAgeUnit} · ${profile.zodiac}`;
}

/** 保存或读取资料后，同步用户摘要列表。 */
export function profileToUser(profile: UserProfile): DemoUser {
  return {
    id: profile.id,
    nickname: profile.nickname,
    avatar_initial: profile.avatar_initial,
    avatar_url: profile.avatar_url ?? null,
    school: profile.school ?? '',
    bio: profile.bio ?? '',
    interests: profile.interests,
    city: profile.city ?? null,
    major: profile.major ?? null,
    job: profile.job ?? null,
    profile_complete: profile.profile_complete,
    student_verified: profile.student_verified,
  };
}