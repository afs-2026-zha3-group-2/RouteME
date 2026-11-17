import { useState, type ReactNode } from 'react';
import { Alert, Button, Input, Typography } from 'antd';
import { loginAccount, registerAccount } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { AuthSession } from '../types';
import {
  authErrorMessage,
  emptyAuthForm,
  toRegisterRequest,
  validateAuthForm,
  type AuthFieldErrors,
  type AuthFormValues,
  type AuthMode,
} from './authForm';

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

/**
 * 登录 / 注册表单。注册收用户名 / 密码（输入两次）/ 昵称与选填邮箱，
 * 学校、兴趣等资料在注册后的完善页填写。
 */
export function AuthPanel({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [values, setValues] = useState<AuthFormValues>(emptyAuthForm);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<AuthFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }));
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
    setSubmitError(null);
  };

  const submit = async () => {
    const found = validateAuthForm(mode, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const session =
        mode === 'login'
          ? await loginAccount(values.username.trim(), values.password)
          : await registerAccount(toRegisterRequest(values));
      onAuthenticated(session);
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      setSubmitError(authErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-panel" aria-label="登录或注册">
      <div className="auth-tabs" role="tablist" aria-label="登录或注册">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={mode === 'login' ? 'auth-tab on' : 'auth-tab'}
          onClick={() => switchMode('login')}
        >
          {tripMessages.authLoginTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={mode === 'register' ? 'auth-tab on' : 'auth-tab'}
          onClick={() => switchMode('register')}
        >
          {tripMessages.authRegisterTab}
        </button>
      </div>

      <div className="auth-fields">
        <AuthField
          label={tripMessages.authUsername}
          hint={mode === 'register' ? tripMessages.authUsernameHint : undefined}
          error={errors.username}
          htmlFor="auth-username"
        >
          <Input
            id="auth-username"
            value={values.username}
            autoComplete="username"
            onChange={(event) => update({ username: event.target.value })}
            onPressEnter={submit}
          />
        </AuthField>

        <AuthField
          label={tripMessages.authPassword}
          hint={mode === 'register' ? tripMessages.authPasswordHint : undefined}
          error={errors.password}
          htmlFor="auth-password"
        >
          <Input.Password
            id="auth-password"
            value={values.password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChange={(event) => update({ password: event.target.value })}
            onPressEnter={submit}
          />
        </AuthField>

        {mode === 'register' && (
          <AuthField
            label={tripMessages.authPasswordConfirm}
            error={errors.passwordConfirm}
            htmlFor="auth-password-confirm"
          >
            <Input.Password
              id="auth-password-confirm"
              value={values.passwordConfirm}
              autoComplete="new-password"
              onChange={(event) => update({ passwordConfirm: event.target.value })}
              onPressEnter={submit}
            />
          </AuthField>
        )}

        {mode === 'register' && (
          <AuthField
            label={tripMessages.authNickname}
            error={errors.nickname}
            htmlFor="auth-nickname"
          >
            <Input
              id="auth-nickname"
              value={values.nickname}
              maxLength={20}
              onChange={(event) => update({ nickname: event.target.value })}
            />
          </AuthField>
        )}

        {mode === 'register' && (
          <AuthField
            label={tripMessages.authEmail}
            hint={tripMessages.authEmailHint}
            error={errors.email}
            htmlFor="auth-email"
          >
            <Input
              id="auth-email"
              value={values.email}
              autoComplete="email"
              onChange={(event) => update({ email: event.target.value })}
              onPressEnter={submit}
            />
          </AuthField>
        )}
      </div>

      {submitError !== null && (
        <Alert type="error" showIcon title={tripMessages.authFailed} description={submitError} />
      )}

      <Button type="primary" size="large" block loading={submitting} onClick={submit}>
        {mode === 'login' ? tripMessages.authLoginSubmit : tripMessages.authRegisterSubmit}
      </Button>
    </section>
  );
}

function AuthField({
  label,
  hint,
  error,
  aside,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  aside?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <div className="form-label-row">
        <label className="form-label" htmlFor={htmlFor}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint !== undefined && <Typography.Text type="secondary" className="auth-hint">{hint}</Typography.Text>}
      {error !== undefined && <Typography.Text type="danger">{error}</Typography.Text>}
    </div>
  );
}