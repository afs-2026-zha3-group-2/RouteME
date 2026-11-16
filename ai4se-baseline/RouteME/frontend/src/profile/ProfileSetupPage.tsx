import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Input,
  Radio,
  Skeleton,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/es/locale/zh_CN';
import {
  ApiError,
  loadUserProfile,
  saveMyProfile,
  uploadAvatar,
} from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import type { DemoUser, UserProfile } from '../types';
import { InterestPicker } from './InterestPicker';
import {
  emptyProfileForm,
  fieldErrorsFromReasons,
  jobFromSelection,
  jobSelection,
  missingFieldLabels,
  profileToForm,
  toUpdateRequest,
  todayIso,
  validateProfileForm,
  type ProfileFieldErrors,
  type ProfileFormValues,
} from './profileForm';
import {
  CITY_NAMES,
  GENDERS,
  JOB_OTHER,
  JOBS,
  MAX_BIO_LENGTH,
  MAX_JOB_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_SCHOOL_LENGTH,
  MBTI_TYPES,
  MIN_BIRTHDAY,
  TRAVEL_STYLES,
} from './profileOptions';

// The picker lives in a Chinese-only UI; keep the panel month names Chinese as well.
dayjs.locale('zh-cn');

type Props = {
  currentUser: DemoUser;
  token: string | null;
  onSaved: (profile: UserProfile) => void;
};

/**
 * 完善 / 编辑个人资料（`#/profile/setup`）。
 * 首次完善显示「跳过」，已完善显示「取消」；保存成功后进入本人主页。
 */
export function ProfileSetupPage({ currentUser, token, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(currentUser.profile_complete);
  const [values, setValues] = useState<ProfileFormValues>({
    ...emptyProfileForm,
    nickname: currentUser.nickname,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser.avatar_url ?? null);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [summary, setSummary] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadUserProfile(currentUser.id, currentUser.id)
      .then((profile) => {
        if (!active) {
          return;
        }
        setValues(profileToForm(profile));
        setAvatarUrl(profile.avatar_url ?? null);
        setProfileComplete(profile.profile_complete);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id]);

  const update = (patch: Partial<ProfileFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }));
    const touched = Object.keys(patch) as Array<keyof ProfileFieldErrors>;
    if (touched.some((field) => errors[field] !== undefined)) {
      setErrors((previous) => {
        const next = { ...previous };
        touched.forEach((field) => delete next[field]);
        return next;
      });
    }
  };

  const applyErrors = (found: ProfileFieldErrors) => {
    setErrors(found);
    setSummary(missingFieldLabels(found));
  };

  const submit = async () => {
    setSubmitError(null);
    const found = validateProfileForm(values);
    applyErrors(found);
    if (Object.keys(found).length > 0 || token === null) {
      return;
    }
    setSaving(true);
    try {
      const profile = await saveMyProfile(token, toUpdateRequest(values));
      setProfileComplete(profile.profile_complete);
      onSaved(profile);
      window.location.hash = `#/users/${profile.id}`;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        applyErrors(fieldErrorsFromReasons(error.fields));
        setSubmitError(error.code);
      } else {
        setSubmitError('UNKNOWN_ERROR');
      }
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async (file: File | undefined) => {
    if (file === undefined || token === null) {
      return;
    }
    setUploading(true);
    setAvatarError(null);
    try {
      const profile = await uploadAvatar(token, file);
      setAvatarUrl(profile.avatar_url ?? null);
      onSaved(profile);
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      setAvatarError(`${tripMessages.profileAvatarFailed}（${code}）`);
    } finally {
      setUploading(false);
    }
  };

  if (token === null) {
    return (
      <main className="profile-page profile-setup">
        <Alert
          type="info"
          showIcon
          title={tripMessages.profileIncompleteShort}
          description={tripMessages.profileDemoReadonly}
          action={
            <Button onClick={() => (window.location.hash = '#/')}>
              {tripMessages.backHome}
            </Button>
          }
        />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="profile-page profile-setup">
        <div className="profile-card">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </main>
    );
  }

  const missingCount = summary.length;
  const avatarUser: DemoUser = { ...currentUser, avatar_url: avatarUrl };

  return (
    <main className="profile-page profile-setup">
      <div className="page-head">
        <Typography.Title level={2} className="page-title">
          {profileComplete ? tripMessages.profileSetupTitleEdit : tripMessages.profileSetupTitleIncomplete}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="profile-page-hint">
          {profileComplete
            ? tripMessages.profileSetupHintEdit
            : tripMessages.profileSetupHintIncomplete}
        </Typography.Paragraph>
      </div>

      {missingCount > 0 && (
        <Alert
          type="warning"
          showIcon
          role="alert"
          className="profile-summary"
          title={`${tripMessages.profileSummaryPrefix} ${missingCount} ${tripMessages.profileSummarySuffix}`}
          description={summary.join('、')}
        />
      )}

      <form
        className="profile-card profile-form"
        aria-label="个人资料"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <section className="profile-avatar">
          <Avatar user={avatarUser} size="xl" />
          <div className="profile-avatar-body">
            <Typography.Text strong>
              {tripMessages.profileAvatarLabel}{' '}
              <span className="profile-optional">{tripMessages.profileAvatarOptional}</span>
            </Typography.Text>
            <Typography.Paragraph type="secondary" className="profile-avatar-hint">
              {tripMessages.profileAvatarHint}
            </Typography.Paragraph>
            <div className="profile-avatar-actions">
              <Button
                size="small"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {avatarUrl === null
                  ? tripMessages.profileAvatarUpload
                  : tripMessages.profileAvatarChange}
              </Button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                aria-label={tripMessages.profileAvatarUpload}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  void pickAvatar(file);
                }}
              />
            </div>
            {avatarError !== null && (
              <Typography.Text type="danger" role="alert">
                {avatarError}
              </Typography.Text>
            )}
          </div>
        </section>

        <div className="profile-field-grid">
          <Field label={tripMessages.profileFieldNickname} required hint={tripMessages.profileNicknameHint} error={errors.nickname} htmlFor="profile-nickname">
            <Input
              id="profile-nickname"
              value={values.nickname}
              maxLength={MAX_NICKNAME_LENGTH}
              status={errors.nickname === undefined ? undefined : 'error'}
              aria-invalid={errors.nickname !== undefined}
              onChange={(event) => update({ nickname: event.target.value })}
            />
          </Field>

          <Field
            label={tripMessages.profileFieldBirthday}
            required
            hint={tripMessages.profileBirthdayHint}
            error={errors.birthday}
            htmlFor="profile-birthday"
          >
<div className="profile-birthday-anchor">
              <DatePicker
                id="profile-birthday"
                className="profile-birthday"
                classNames={{ popup: { root: 'profile-birthday-popup' } }}
                getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                value={values.birthday === '' ? null : dayjs(values.birthday)}
                minDate={dayjs(MIN_BIRTHDAY)}
                maxDate={dayjs(todayIso())}
                format="YYYY-MM-DD"
                locale={zhCN.DatePicker}
                needConfirm
                allowClear={false}
                status={errors.birthday === undefined ? undefined : 'error'}
                aria-invalid={errors.birthday !== undefined}
                onChange={(date) => update({ birthday: date === null ? '' : date.format('YYYY-MM-DD') })}
              />
            </div>
          </Field>

          <Field label={tripMessages.profileFieldGender} required error={errors.gender}>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={values.gender}
              options={GENDERS.map((gender) => ({ label: gender, value: gender }))}
              onChange={(event) => update({ gender: event.target.value as string })}
            />
          </Field>

          <Field label={tripMessages.profileFieldCity} required error={errors.city} htmlFor="profile-city">
            <AutoComplete
              id="profile-city"
              value={values.city}
              options={CITY_NAMES.map((city) => ({ value: city }))}
              status={errors.city === undefined ? undefined : 'error'}
              aria-invalid={errors.city !== undefined}
              placeholder="例如：广州"
              onChange={(value: string) => update({ city: value })}
            />
          </Field>

          <Field label={tripMessages.profileFieldSchool} error={errors.school} htmlFor="profile-school">
            <Input
              id="profile-school"
              value={values.school}
              maxLength={MAX_SCHOOL_LENGTH}
              placeholder="例如：中山大学"
              status={errors.school === undefined ? undefined : 'error'}
              onChange={(event) => update({ school: event.target.value })}
            />
          </Field>

          <Field label={tripMessages.profileFieldMajor} error={errors.major} htmlFor="profile-major">
            <Input
              id="profile-major"
              value={values.major}
              maxLength={MAX_SCHOOL_LENGTH}
              placeholder="例如：地理科学"
              status={errors.major === undefined ? undefined : 'error'}
              onChange={(event) => update({ major: event.target.value })}
            />
          </Field>

          <Field label={tripMessages.profileFieldJob} error={errors.job} htmlFor="profile-job">
            {/*
             * Native select on purpose: antd 6.7 renders its popup off-screen when the OS asks for
             * reduced motion (`prefers-reduced-motion: reduce`), so the option list never shows.
             */}
            <select
              id="profile-job"
              className="native-select"
              aria-invalid={errors.job !== undefined}
              value={jobSelection(values.job).choice}
              onChange={(event) => update({ job: event.target.value })}
            >
              <option value="">不填写</option>
              {JOBS.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
            {jobSelection(values.job).choice === JOB_OTHER && (
              <Input
                id="profile-job-custom"
                className="profile-job-custom"
                value={jobSelection(values.job).custom}
                maxLength={MAX_JOB_LENGTH}
                aria-label={tripMessages.profileJobCustom}
                placeholder={tripMessages.profileJobCustomPlaceholder}
                status={errors.job === undefined ? undefined : 'error'}
                aria-invalid={errors.job !== undefined}
                onChange={(event) => update({ job: jobFromSelection(JOB_OTHER, event.target.value) })}
              />
            )}
          </Field>

          <Field label={tripMessages.profileFieldMbti} error={errors.mbti} htmlFor="profile-mbti">
            <select
              id="profile-mbti"
              className="native-select"
              aria-invalid={errors.mbti !== undefined}
              value={values.mbti}
              onChange={(event) => update({ mbti: event.target.value })}
            >
              <option value="">不填写</option>
              {MBTI_TYPES.map((mbti) => (
                <option key={mbti} value={mbti}>
                  {mbti}
                </option>
              ))}
            </select>
          </Field>

          <InterestPicker
            value={values.interests}
            error={errors.interests}
            onChange={(interests) => update({ interests })}
          />

          <Field
            label={tripMessages.profileFieldTravelStyle}
            required
            hint={tripMessages.profileSingleChoiceHint}
            error={errors.travel_style}
            wide
          >
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={values.travel_style}
              options={TRAVEL_STYLES.map((style) => ({ label: style, value: style }))}
              onChange={(event) => update({ travel_style: event.target.value as string })}
            />
          </Field>

          <Field label={tripMessages.profileFieldBio} hint={tripMessages.profileBioHint} error={errors.bio} wide htmlFor="profile-bio">
            <Input.TextArea
              id="profile-bio"
              rows={3}
              maxLength={MAX_BIO_LENGTH}
              showCount
              value={values.bio}
              status={errors.bio === undefined ? undefined : 'error'}
              onChange={(event) => update({ bio: event.target.value })}
            />
          </Field>
        </div>

        {submitError !== null && (
          <Alert
            type="error"
            showIcon
            title={tripMessages.profileSaveFailed}
            description={submitError}
          />
        )}

        <footer className="profile-form-foot">
          <Button type="primary" htmlType="submit" loading={saving}>
            {tripMessages.profileSave}
          </Button>
          {profileComplete ? (
            <a className="profile-text-link" href={`#/users/${currentUser.id}`}>
              {tripMessages.profileCancel}
            </a>
          ) : (
            <Button onClick={() => (window.location.hash = '#/')}>
              {tripMessages.profileSkip}
            </Button>
          )}
          <span className="profile-foot-hint">{tripMessages.profileSaveHint}</span>
        </footer>
      </form>
    </main>
  );
}

function Field({
  label,
  required = false,
  hint,
  error,
  wide = false,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  wide?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className={wide ? 'profile-field wide' : 'profile-field'}>
      <div className="form-label-row">
        <label className="form-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="profile-required"> *</span>}
        </label>
        {hint !== undefined && <span className="profile-field-hint">{hint}</span>}
      </div>
      {children}
      {error !== undefined && (
        <Typography.Text type="danger" role="alert">
          {error}
        </Typography.Text>
      )}
    </div>
  );
}