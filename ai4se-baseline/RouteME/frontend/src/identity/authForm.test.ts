import { describe, expect, it } from 'vitest';
import {
  addInterest,
  authErrorMessage,
  emptyAuthForm,
  MAX_INTEREST_LENGTH,
  MAX_INTERESTS,
  PRESET_INTERESTS,
  removeInterest,
  toRegisterRequest,
  validateAuthForm,
  type AuthFormValues,
} from './authForm';

const validRegister: AuthFormValues = {
  ...emptyAuthForm,
  username: 'NewUser',
  password: 'routeme-demo',
  nickname: '新同学',
  school: '大二 · 建筑学',
  bio: '想看海。',
  interests: ['摄影', '海边'],
};

describe('validateAuthForm', () => {
  it('accepts a complete register form', () => {
    expect(validateAuthForm('register', validRegister)).toEqual({});
  });

  it('requires username and password on login', () => {
    const errors = validateAuthForm('login', emptyAuthForm);
    expect(errors.username).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('does not apply register-only rules on login', () => {
    expect(validateAuthForm('login', { ...emptyAuthForm, username: 'ab', password: 'x' })).toEqual({});
  });

  it('rejects malformed username and short password on register', () => {
    const errors = validateAuthForm('register', {
      ...validRegister,
      username: 'bad name',
      password: 'short',
    });
    expect(errors.username).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('rejects missing nickname and school', () => {
    const errors = validateAuthForm('register', { ...validRegister, nickname: ' ', school: '' });
    expect(errors.nickname).toBeDefined();
    expect(errors.school).toBeDefined();
  });

  it('bounds interests by count and length', () => {
    expect(
      validateAuthForm('register', { ...validRegister, interests: ['一', '二', '三', '四', '五', '六'] })
        .interests,
    ).toBeDefined();
    expect(
      validateAuthForm('register', {
        ...validRegister,
        interests: ['这个兴趣标签确实是太长了吧'],
      }).interests,
    ).toBeDefined();
  });

  it('rejects empty and duplicate interests', () => {
    expect(
      validateAuthForm('register', { ...validRegister, interests: ['摄影', '  '] }).interests,
    ).toBeDefined();
    expect(
      validateAuthForm('register', { ...validRegister, interests: ['摄影', '摄影'] }).interests,
    ).toBeDefined();
  });
});

describe('addInterest', () => {
  it('adds a trimmed custom tag', () => {
    expect(addInterest(['摄影'], '  看展  ')).toEqual({ interests: ['摄影', '看展'], error: null });
  });

  it('rejects an empty tag', () => {
    const result = addInterest([], '   ');
    expect(result.interests).toEqual([]);
    expect(result.error).toContain('请输入');
  });

  it('rejects a duplicate tag', () => {
    const result = addInterest(['摄影'], '摄影');
    expect(result.interests).toEqual(['摄影']);
    expect(result.error).toContain('已经在列表');
  });

  it('rejects a tag over 12 characters', () => {
    const result = addInterest([], '这个兴趣标签确实是太长了吧');
    expect(result.interests).toEqual([]);
    expect(result.error).toContain('12');
  });

  it('rejects a sixth tag', () => {
    const result = addInterest(['一', '二', '三', '四', '五'], '六');
    expect(result.interests).toHaveLength(MAX_INTERESTS);
    expect(result.error).toContain('5');
  });
});

describe('removeInterest', () => {
  it('removes only the matching tag', () => {
    expect(removeInterest(['摄影', '海边', '看展'], '海边')).toEqual(['摄影', '看展']);
  });
});

describe('preset interests', () => {
  it('fits the contract limits', () => {
    expect(PRESET_INTERESTS.length).toBeLessThanOrEqual(MAX_INTERESTS * 3);
    expect(PRESET_INTERESTS.every((tag) => tag.length <= MAX_INTEREST_LENGTH)).toBe(true);
  });
});

describe('toRegisterRequest', () => {
  it('maps the form to the contract payload', () => {
    expect(toRegisterRequest(validRegister)).toEqual({
      username: 'NewUser',
      password: 'routeme-demo',
      nickname: '新同学',
      school: '大二 · 建筑学',
      bio: '想看海。',
      interests: ['摄影', '海边'],
    });
  });

  it('omits a blank bio', () => {
    expect(toRegisterRequest({ ...validRegister, bio: '  ' }).bio).toBeUndefined();
  });
});

describe('authErrorMessage', () => {
  it('maps contract codes to readable copy', () => {
    expect(authErrorMessage('USERNAME_TAKEN')).toContain('用户名');
    expect(authErrorMessage('INVALID_CREDENTIALS')).toContain('密码');
    expect(authErrorMessage('SOMETHING_ELSE')).toContain('SOMETHING_ELSE');
  });
});