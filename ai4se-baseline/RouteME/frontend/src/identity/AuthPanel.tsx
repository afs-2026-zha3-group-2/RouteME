import { useState, type ReactNode } from 'react';
import { Alert, Button, Input, Typography } from 'antd';
import { loginAccount, registerAccount } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { AuthSession } from '../types';
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
  const [interestError, setInterestError] = useState<string | null>(null);
  const [customInterest, setCustomInterest] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<AuthFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }));
  };

  const allInterests = [...PRESET_INTERESTS, ...customTags];
  const interestsFull = values.interests.length >= MAX_INTERESTS;

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
    setSubmitError(null);
    setInterestError(null);
  };

  const toggleInterest = (tag: string) => {
    if (values.interests.includes(tag)) {
      update({ interests: removeInterest(values.interests, tag) });
      setInterestError(null);
      return;
    }
    const result = addInterest(values.interests, tag);
    if (result.error !== null) {
      setInterestError(result.error);
      return;
    }
    update({ interests: result.interests });
    setInterestError(null);
  };

  const submitCustomInterest = () => {
    const tag = customInterest.trim();
    if (tag !== '' && allInterests.includes(tag)) {
      setInterestError(tripMessages.authErrorInterestDuplicate);
      return;
    }
    const result = addInterest(values.interests, customInterest);
    if (result.error !== null) {
      setInterestError(result.error);
      return;
    }
    setCustomTags((previous) => (previous.includes(tag) ? previous : [...previous, tag]));
    update({ interests: result.interests });
    setCustomInterest('');
    setInterestError(null);
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
              aside={
                <span className={interestsFull ? 'interest-count full' : 'interest-count'}>
                  {tripMessages.authInterestsSelected} {values.interests.length}/{MAX_INTERESTS}
                </span>
              }
              hint={tripMessages.authInterestsHint}
              error={errors.interests ?? interestError ?? undefined}
            >
              <div className="interest-picker">
                <div className="interest-grid" role="group" aria-label={tripMessages.authInterests}>
                  {allInterests.map((tag) => {
                    const selected = values.interests.includes(tag);
                    const atMax = !selected && interestsFull;
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={[
                          'interest-card',
                          selected ? 'on' : '',
                          atMax ? 'at-max' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={selected}
                        title={selected ? `取消 ${tag}` : atMax ? '已达 5 个上限' : `选择 ${tag}`}
                        onClick={() => toggleInterest(tag)}
                      >
                        {selected && (
                          <span className="interest-tick" aria-hidden="true">
                            ✓
                          </span>
                        )}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="interest-custom">
                  <Input
                    value={customInterest}
                    maxLength={MAX_INTEREST_LENGTH}
                    disabled={interestsFull}
                    placeholder={
                      interestsFull
                        ? tripMessages.authCustomInterestFull
                        : tripMessages.authCustomInterestPlaceholder
                    }
                    onChange={(event) => {
                      setCustomInterest(event.target.value);
                      setInterestError(null);
                    }}
                    onPressEnter={submitCustomInterest}
                  />
                  <Button className="interest-add" disabled={interestsFull} onClick={submitCustomInterest}>
                    {tripMessages.authAddInterest}
                  </Button>
                </div>
              </div>
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
  aside,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <div className="form-label-row">
        <span className="form-label">{label}</span>
        {aside}
      </div>
      {children}
      {hint !== undefined && <Typography.Text type="secondary" className="auth-hint">{hint}</Typography.Text>}
      {error !== undefined && <Typography.Text type="danger">{error}</Typography.Text>}
    </div>
  );
}