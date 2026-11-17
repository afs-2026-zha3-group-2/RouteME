import { describe, expect, it } from 'vitest';
import type { UserProfile } from '../types';
import {
  ageZodiacLabel,
  hasPublicContent,
  profileToUser,
  publisherSummary,
  schoolMajor,
} from './profileDisplay';

describe('schoolMajor', () => {
  it('joins school and major with a middot', () => {
    expect(schoolMajor({ school: '中山大学', major: '地理科学' })).toBe('中山大学 · 地理科学');
  });

  it('shows only the school when the major is empty', () => {
    expect(schoolMajor({ school: '中山大学', major: '' })).toBe('中山大学');
    expect(schoolMajor({ school: '中山大学', major: null })).toBe('中山大学');
  });

  it('returns an empty string without a school', () => {
    expect(schoolMajor({ school: '', major: '地理科学' })).toBe('');
    expect(schoolMajor({})).toBe('');
  });
});

describe('publisherSummary', () => {
  it('prefers school and major', () => {
    expect(
      publisherSummary({ school: '中山大学', major: '地理科学', job: '学生', city: '广州' }),
    ).toBe('中山大学 · 地理科学');
  });

  it('falls back to the job when the school is empty', () => {
    expect(publisherSummary({ school: '', major: '', job: '上班族', city: '杭州' })).toBe('上班族');
  });

  it('falls back to the city when school and job are empty', () => {
    expect(publisherSummary({ school: null, major: null, job: '', city: '杭州' })).toBe('杭州');
  });

  it('omits the summary when all three are empty', () => {
    expect(publisherSummary({ school: '', major: '', job: '', city: '' })).toBe('');
  });
});

describe('hasPublicContent', () => {
  const base: UserProfile = {
    id: 9,
    nickname: '新同学',
    avatar_initial: '新',
    interests: [],
    profile_complete: false,
    credit_score: 80,
    credit_level: 'good',
    credit_restricted: false,
  };

  it('is false when only the nickname exists', () => {
    expect(hasPublicContent(base)).toBe(false);
  });

  it('is true when any optional field is filled', () => {
    expect(hasPublicContent({ ...base, city: '杭州' })).toBe(true);
    expect(hasPublicContent({ ...base, interests: ['徒步'] })).toBe(true);
    expect(hasPublicContent({ ...base, bio: '喜欢山。' })).toBe(true);
  });
});

describe('ageZodiacLabel', () => {
  it('joins age and zodiac', () => {
    expect(ageZodiacLabel({ age: 23, zodiac: '金牛座' })).toBe('23 岁 · 金牛座');
  });

  it('is empty without a birthday-derived value', () => {
    expect(ageZodiacLabel({ age: null, zodiac: null })).toBe('');
  });
});

describe('profileToUser', () => {
  it('keeps the nickname initial when the avatar is absent', () => {
    const user = profileToUser({
      id: 9,
      nickname: '林见夏',
      avatar_initial: '林',
      interests: ['摄影'],
      profile_complete: true,
      credit_score: 80,
      credit_level: 'good',
      credit_restricted: false,
    });
    expect(user.avatar_initial).toBe('林');
    expect(user.avatar_url).toBeNull();
    expect(user.profile_complete).toBe(true);
  });
});