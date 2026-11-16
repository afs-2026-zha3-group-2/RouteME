import { describe, expect, it } from 'vitest';
import {
  authErrorMessage,
  emptyAuthForm,
  parseInterests,
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
  interests: '摄影, 海边、美食',
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
      validateAuthForm('register', { ...validRegister, interests: '一,二,三,四,五,六' }).interests,
    ).toBeDefined();
    expect(
      validateAuthForm('register', { ...validRegister, interests: '这个兴趣标签确实是太长了吧' }).interests,
    ).toBeDefined();
  });
});

describe('parseInterests', () => {
  it('splits several separators, trims and de-duplicates', () => {
    expect(parseInterests(' 摄影, 海边、摄影  美食 ')).toEqual(['摄影', '海边', '美食']);
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
      interests: ['摄影', '海边', '美食'],
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