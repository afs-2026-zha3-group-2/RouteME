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
 * 登录 / 注册表单。校验规则与后端 AuthConstant 保持一致，
 * 提交成功后把会话交给 App 保存。
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
        >
          <Input
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
        >
          <Input.Password
            value={values.password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChange={(event) => update({ password: event.target.value })}
            onPressEnter={submit}
          />
        </AuthField>

        {mode === 'register' && (
          <>
            <AuthField label={tripMessages.authNickname} error={errors.nickname}>
              <Input
                value={values.nickname}
                maxLength={20}
                onChange={(event) => update({ nickname: event.target.value })}
              />
            </AuthField>
            <AuthField label={tripMessages.authSchool} error={errors.school}>
              <Input
                value={values.school}
                maxLength={80}
                placeholder="例如：大二 · 建筑学"
                onChange={(event) => update({ school: event.target.value })}
              />
            </AuthField>
            <AuthField
              label={tripMessages.authInterests}
              hint={tripMessages.authInterestsHint}
              error={errors.interests}
            >
              <Input
                value={values.interests}
                placeholder="摄影, 海边, 美食"
                onChange={(event) => update({ interests: event.target.value })}
              />
            </AuthField>
            <AuthField label={tripMessages.authBio} error={errors.bio}>
              <Input.TextArea
                rows={2}
                maxLength={500}
                showCount
                value={values.bio}
                onChange={(event) => update({ bio: event.target.value })}
              />
            </AuthField>
          </>
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
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <span className="form-label">{label}</span>
      {children}
      {hint !== undefined && <Typography.Text type="secondary" className="auth-hint">{hint}</Typography.Text>}
      {error !== undefined && <Typography.Text type="danger">{error}</Typography.Text>}
    </div>
  );
}