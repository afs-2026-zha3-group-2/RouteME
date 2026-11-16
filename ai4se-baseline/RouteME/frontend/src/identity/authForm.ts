import { tripMessages } from '../i18n/tripMessages';
import type { AuthRegisterRequest } from '../types';

export type AuthMode = 'login' | 'register';

/**
 * 注册收用户名 / 密码 / 确认密码 / 昵称；资料在完善页填写。
 * 确认密码只做前端比对，不进入请求体。
 */
export type AuthFormValues = {
  username: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
};

export type AuthFieldErrors = Partial<
  Record<'username' | 'password' | 'passwordConfirm' | 'nickname', string>
>;

export const emptyAuthForm: AuthFormValues = {
  username: '',
  password: '',
  passwordConfirm: '',
  nickname: '',
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 64;
const MAX_NICKNAME = 20;

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
    if (values.passwordConfirm === '') {
      errors.passwordConfirm = tripMessages.authErrorPasswordConfirmRequired;
    } else if (values.passwordConfirm !== values.password) {
      errors.passwordConfirm = tripMessages.authErrorPasswordMismatch;
    }

    const nickname = values.nickname.trim();
    if (nickname === '' || nickname.length > MAX_NICKNAME) {
      errors.nickname = tripMessages.authErrorNickname;
    }
  }
  return errors;
}

export function toRegisterRequest(values: AuthFormValues): AuthRegisterRequest {
  return {
    username: values.username.trim(),
    password: values.password,
    nickname: values.nickname.trim(),
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