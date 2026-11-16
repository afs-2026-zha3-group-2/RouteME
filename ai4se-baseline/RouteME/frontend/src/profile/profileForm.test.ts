import { describe, expect, it } from 'vitest';
import { tripMessages } from '../i18n/tripMessages';
import {
  addInterest,
  emptyProfileForm,
  fieldErrorsFromReasons,
  jobFromSelection,
  jobSelection,
  missingFieldLabels,
  profileToForm,
  removeInterest,
  toUpdateRequest,
  validateProfileForm,
  type ProfileFormValues,
} from './profileForm';

const TODAY = '2026-11-16';

const validProfile: ProfileFormValues = {
  ...emptyProfileForm,
  nickname: '林见夏',
  birthday: '2003-05-18',
  gender: '女',
  city: '广州',
  school: '中山大学',
  major: '地理科学',
  job: '学生',
  mbti: 'INFP',
  interests: ['摄影', '自然', '展览'],
  travel_style: '深度游',
  bio: '喜欢日落前一小时的光。',
};

describe('validateProfileForm', () => {
  it('accepts a complete profile', () => {
    expect(validateProfileForm(validProfile, TODAY)).toEqual({});
  });

  it('requires nickname, birthday, gender, city, interests and travel style', () => {
    const errors = validateProfileForm(emptyProfileForm, TODAY);
    expect(errors.nickname).toBeDefined();
    expect(errors.birthday).toBeDefined();
    expect(errors.gender).toBeDefined();
    expect(errors.city).toBeDefined();
    expect(errors.interests).toBeDefined();
    expect(errors.travel_style).toBeDefined();
  });

  it('lists the missing field labels in form order', () => {
    const errors = validateProfileForm(
      { ...validProfile, birthday: '', gender: '', city: '', interests: [], travel_style: '' },
      TODAY,
    );
    expect(missingFieldLabels(errors)).toEqual([
      '生日',
      '性别',
      '所在城市',
      '旅行兴趣',
      '旅行方式',
    ]);
  });

  it('keeps a single travel style', () => {
    expect(validateProfileForm({ ...validProfile, travel_style: '休闲游' }, TODAY)).toEqual({});
    expect(
      validateProfileForm({ ...validProfile, travel_style: '休闲游,深度游' }, TODAY).travel_style,
    ).toBeDefined();
  });

  it('rejects fewer than three interests', () => {
    expect(
      validateProfileForm({ ...validProfile, interests: ['摄影', '海边'] }, TODAY).interests,
    ).toContain('3');
  });

  it('rejects more than five interests', () => {
    expect(
      validateProfileForm(
        { ...validProfile, interests: ['一', '二', '三', '四', '五', '六'] },
        TODAY,
      ).interests,
    ).toBeDefined();
  });

  it('rejects duplicate and over-long interests', () => {
    expect(
      validateProfileForm({ ...validProfile, interests: ['摄影', '摄影', '展览'] }, TODAY)
        .interests,
    ).toBeDefined();
    expect(
      validateProfileForm(
        { ...validProfile, interests: ['摄影', '自然', '这个兴趣标签确实是太长了吧'] },
        TODAY,
      ).interests,
    ).toContain('12');
  });

  it('rejects a future or malformed birthday', () => {
    expect(
      validateProfileForm({ ...validProfile, birthday: '2026-11-17' }, TODAY).birthday,
    ).toBeDefined();
    expect(validateProfileForm({ ...validProfile, birthday: '2003-02-30' }, TODAY).birthday).toBeDefined();
    expect(validateProfileForm({ ...validProfile, birthday: '2003/05/18' }, TODAY).birthday).toBeDefined();
    expect(validateProfileForm({ ...validProfile, birthday: '1899-12-31' }, TODAY).birthday).toBeDefined();
  });

  it('accepts a profile without optional fields', () => {
    expect(
      validateProfileForm(
        { ...validProfile, school: '', major: '', job: '', mbti: '', bio: '' },
        TODAY,
      ),
    ).toEqual({});
  });

  it('accepts a custom job typed under 其他', () => {
    expect(validateProfileForm({ ...validProfile, job: '独立摄影师' }, TODAY)).toEqual({});
    expect(validateProfileForm({ ...validProfile, job: '其他' }, TODAY)).toEqual({});
  });

  it('rejects a job longer than twenty characters', () => {
    expect(validateProfileForm({ ...validProfile, job: '职'.repeat(21) }, TODAY).job).toContain('20');
  });
});

describe('jobSelection', () => {
  it('maps a preset straight to the option', () => {
    expect(jobSelection('')).toEqual({ choice: '', custom: '' });
    expect(jobSelection('学生')).toEqual({ choice: '学生', custom: '' });
    expect(jobSelection('其他')).toEqual({ choice: '其他', custom: '' });
  });

  it('reads any other text as 其他 plus the custom value', () => {
    expect(jobSelection('独立摄影师')).toEqual({ choice: '其他', custom: '独立摄影师' });
  });
});

describe('jobFromSelection', () => {
  it('keeps the preset choice', () => {
    expect(jobFromSelection('学生', '')).toBe('学生');
    expect(jobFromSelection('', '')).toBe('');
  });

  it('keeps the typed text and falls back to 其他 when blank', () => {
    expect(jobFromSelection('其他', '独立摄影师')).toBe('独立摄影师');
    expect(jobFromSelection('其他', '   ')).toBe('其他');
    expect(jobFromSelection('其他', '')).toBe('其他');
  });
});

describe('addInterest', () => {
  it('adds a trimmed custom tag', () => {
    expect(addInterest(['摄影'], '  温泉 ')).toEqual({ interests: ['摄影', '温泉'], error: null });
  });

  it('caps the selection at five', () => {
    const result = addInterest(['一', '二', '三', '四', '五'], '六');
    expect(result.interests).toHaveLength(5);
    expect(result.error).toContain('5');
  });

  it('keeps a cancelled custom tag available for reselection', () => {
    const tag = '温泉';
    const afterAdd = addInterest(['摄影'], tag).interests;
    const afterRemove = removeInterest(afterAdd, tag);
    expect(afterRemove).toEqual(['摄影']);
    expect(addInterest(afterRemove, tag).interests).toEqual(['摄影', '温泉']);
  });

  it('rejects empty, duplicate and over-long tags', () => {
    expect(addInterest([], '  ').error).toBeDefined();
    expect(addInterest(['摄影'], '摄影').error).toContain('重复');
    expect(addInterest([], '这个兴趣标签确实是太长了吧').error).toContain('12');
  });
});

describe('fieldErrorsFromReasons', () => {
  it('maps contract reason codes to field copy', () => {
    const errors = fieldErrorsFromReasons({
      birthday: 'INVALID_DATE',
      interests: 'TOO_FEW',
      travel_style: 'REQUIRED',
      unknown_field: 'REQUIRED',
    });
    expect(errors.birthday).toBe(tripMessages.profileErrorBirthday);
    expect(errors.interests).toBe(tripMessages.profileErrorInterests);
    expect(errors.travel_style).toBe(tripMessages.profileErrorTravelStyle);
    expect(Object.keys(errors)).not.toContain('unknown_field');
  });

  it('maps TOO_LONG per field', () => {
    const errors = fieldErrorsFromReasons({ interests: 'TOO_LONG', school: 'TOO_LONG' });
    expect(errors.interests).toBe(tripMessages.profileErrorInterestsLength);
    expect(errors.school).toBe(tripMessages.profileErrorSchool);
  });
});

describe('toUpdateRequest', () => {
  it('trims values and nulls blank optional fields', () => {
    expect(
      toUpdateRequest({
        ...validProfile,
        nickname: '  林见夏  ',
        city: ' 广州 ',
        school: '   ',
        major: ' 地理科学 ',
        job: '',
        mbti: '',
        bio: '   ',
      }),
    ).toEqual({
      nickname: '林见夏',
      birthday: '2003-05-18',
      gender: '女',
      city: '广州',
      interests: ['摄影', '自然', '展览'],
      travel_style: '深度游',
      school: null,
      major: '地理科学',
      job: null,
      mbti: null,
      bio: null,
    });
  });
});

describe('profileToForm', () => {
  it('fills missing fields with empty values', () => {
    expect(
      profileToForm({
        id: 9,
        nickname: '新同学',
        avatar_initial: '新',
        interests: [],
        profile_complete: false,
      }),
    ).toEqual({
      ...emptyProfileForm,
      nickname: '新同学',
    });
  });
});