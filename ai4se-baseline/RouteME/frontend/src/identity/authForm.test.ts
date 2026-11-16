import { describe, expect, it } from 'vitest';
import {
  authErrorMessage,
  emptyAuthForm,
  toRegisterRequest,
  validateAuthForm,
  type AuthFormValues,
} from './authForm';

const validRegister: AuthFormValues = {
  ...emptyAuthForm,
  username: 'NewUser',
  password: 'routeme-demo',
  nickname: '新同学',
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

  it('rejects a missing or over-long nickname', () => {
    expect(validateAuthForm('register', { ...validRegister, nickname: ' ' }).nickname).toBeDefined();
    expect(
      validateAuthForm('register', { ...validRegister, nickname: '一'.repeat(21) }).nickname,
    ).toBeDefined();
  });
});

describe('toRegisterRequest', () => {
  it('maps only the three registration fields', () => {
    expect(toRegisterRequest({ ...validRegister, username: '  NewUser  ' })).toEqual({
      username: 'NewUser',
      password: 'routeme-demo',
      nickname: '新同学',
    });
  });
});

describe('authErrorMessage', () => {
  it('maps contract codes to readable copy', () => {
    expect(authErrorMessage('USERNAME_TAKEN')).toContain('用户名');
    expect(authErrorMessage('INVALID_CREDENTIALS')).toContain('密码');
    expect(authErrorMessage('SOMETHING_ELSE')).toContain('SOMETHING_ELSE');
  });
});