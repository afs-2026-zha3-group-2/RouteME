import { useEffect, useState } from 'react';
import { Alert, Button, Input, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { ApiError, loadUserProfile, verifyStudentIdentity } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser, UserProfile } from '../types';
import { StudentShield } from './StudentVerificationGate';
import {
  emptyStudentVerificationForm,
  fieldErrorsFromReasons,
  toStudentVerificationRequest,
  validateStudentVerification,
  type StudentVerificationFieldErrors,
  type StudentVerificationFormValues,
} from './studentVerification';

type Props = {
  currentUser: DemoUser;
  token: string | null;
  onVerified: (user: DemoUser) => void;
};

/**
 * 学信网学籍认证页（`#/verify/student`）：演示核验。
 * 未认证展示「操作指引 + 表单」，已认证展示认证信息并允许重新认证。
 */
export function StudentVerificationPage({ currentUser, token, onVerified }: Props) {
  const verified = currentUser.student_verified;
  const isAdmin = currentUser.role === 'ADMIN';
  const [values, setValues] = useState<StudentVerificationFormValues>(emptyStudentVerificationForm);
  const [errors, setErrors] = useState<StudentVerificationFieldErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(!verified);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [justVerifiedSchool, setJustVerifiedSchool] = useState<string | null>(null);
  const [justVerifiedAt, setJustVerifiedAt] = useState<string | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    if (!verified) {
      return;
    }
    let active = true;
    loadUserProfile(currentUser.id, currentUser.id)
      .then((loaded) => {
        if (active) {
          setProfile(loaded);
        }
      })
      .catch(() => {
        // 认证信息读不到时退回会话里的资料，不阻塞页面。
        if (active) {
          setProfile(null);
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id, verified, profileVersion]);

  const update = (patch: Partial<StudentVerificationFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }));
  };

  const submit = async () => {
    if (token === null) {
      setActionError(tripMessages.studentVerifyNeedLogin);
      return;
    }
    const found = validateStudentVerification(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const user = await verifyStudentIdentity(token, toStudentVerificationRequest(values));
      setJustVerifiedSchool(user.student_verified ? values.school.trim() : null);
      setJustVerifiedAt(user.student_verified ? new Date().toISOString() : null);
      onVerified(user);
      setFormOpen(false);
      // 重新认证时 verified 不会变化，主动重拉一次资料，避免认证院校/时间停留在旧值。
      setProfileVersion((version) => version + 1);
      message.success(tripMessages.studentVerifySuccess);
    } catch (caught: unknown) {
      if (caught instanceof ApiError) {
        if (caught.code === 'INVALID_INPUT') {
          const fieldErrors = fieldErrorsFromReasons(caught.fields);
          setErrors(fieldErrors);
          if (Object.keys(fieldErrors).length === 0) {
            setActionError(caught.detail ?? tripMessages.studentVerifyFailed);
          }
          return;
        }
        if (caught.code === 'SESSION_INVALID') {
          setActionError(tripMessages.studentVerifyNeedLogin);
          return;
        }
        setActionError(caught.code);
        return;
      }
      setActionError(caught instanceof Error ? caught.message : tripMessages.studentVerifyFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const verifiedSchool =
    justVerifiedSchool ?? profile?.student_verified_school ?? currentUser.school ?? '';
  const verifiedAt = justVerifiedAt ?? profile?.student_verified_at ?? null;

  return (
    <main className="form-page chsi-page">
      <section className="chsi-hero">
        <div className="chsi-hero-main">
          <span className="chsi-eyebrow">
            <StudentShield small />
            {tripMessages.studentVerifyTitle} · 演示核验
          </span>
          <h1>先确认你是在校大学生，再一起出发</h1>
          <p>{tripMessages.studentVerifySubtitle}</p>
          <ul className="chsi-perks">
            <li>发布行程</li>
            <li>申请同行</li>
            <li>与同路的人聊天</li>
            <li>分享游后体验</li>
          </ul>
        </div>
        <div className={verified ? 'chsi-status-card verified' : 'chsi-status-card'}>
          <StudentShield />
          <b>{currentUser.nickname}</b>
          <span className={verified || isAdmin ? 'badge jade' : 'badge muted'}>
            {isAdmin
              ? tripMessages.studentVerifyAdminBadge
              : verified
                ? tripMessages.studentVerifyVerifiedBadge
                : tripMessages.studentVerifyPendingBadge}
          </span>
          <small>
            {isAdmin
              ? tripMessages.studentVerifyAdminNote
              : verified
                ? verifiedSchool || '学籍信息已确认'
                : '完成认证后解锁核心功能'}
          </small>
        </div>
      </section>

      {isAdmin && !verified && (
        <Alert type="info" showIcon title={tripMessages.studentVerifyAdminNote} />
      )}

      {verified && (
        <section className="chsi-card chsi-verified">
          <div className="chsi-verified-head">
            <StudentShield />
            <div>
              <h2>{tripMessages.studentVerifyVerifiedTitle}</h2>
              <p>{tripMessages.studentVerifyVerifiedBody}</p>
            </div>
          </div>
          <dl className="chsi-facts">
            <div>
              <dt>{tripMessages.studentVerifySchoolLabel}</dt>
              <dd>{verifiedSchool === '' ? '—' : verifiedSchool}</dd>
            </div>
            <div>
              <dt>{tripMessages.studentVerifyAtLabel}</dt>
              <dd>{verifiedAt === null ? '—' : dayjs(verifiedAt).format('YYYY-MM-DD HH:mm')}</dd>
            </div>
          </dl>
          <div className="chsi-verified-actions">
            <Button onClick={() => setFormOpen((open) => !open)}>
              {formOpen ? tripMessages.studentVerifyCancelReverify : tripMessages.studentVerifyReverify}
            </Button>
            <Button type="link" onClick={() => (window.location.hash = '#/')}>
              {tripMessages.backHome}
            </Button>
          </div>
        </section>
      )}

      {!isAdmin && (!verified || formOpen) && (
        <div className="chsi-grid">
          <section className="chsi-card chsi-guide">
            <h2>{tripMessages.studentVerifyGuideTitle}</h2>
            <ol>
              <li>
                <span>1</span>
                <p>{tripMessages.studentVerifyGuideStep1}</p>
              </li>
              <li>
                <span>2</span>
                <p>{tripMessages.studentVerifyGuideStep2}</p>
              </li>
              <li>
                <span>3</span>
                <p>{tripMessages.studentVerifyGuideStep3}</p>
              </li>
            </ol>
            <p className="chsi-demo-hint">{tripMessages.studentVerifyDemoHint}</p>
          </section>

          <section className="chsi-card chsi-form">
            <h2>{tripMessages.studentVerifyTitle}</h2>

            {token === null && (
              <Alert type="warning" showIcon title={tripMessages.studentVerifyNeedLogin} />
            )}

            <label className="form-field" htmlFor="chsi-name">
              <span className="form-label">{tripMessages.studentVerifyFieldName}</span>
              <Input
                id="chsi-name"
                value={values.name}
                maxLength={20}
                autoComplete="name"
                aria-invalid={errors.name !== undefined}
                status={errors.name === undefined ? undefined : 'error'}
                placeholder={tripMessages.studentVerifyFieldNameHint}
                onChange={(event) => update({ name: event.target.value })}
                onPressEnter={submit}
              />
              {errors.name !== undefined && (
                <Typography.Text type="danger">{errors.name}</Typography.Text>
              )}
            </label>

            <label className="form-field" htmlFor="chsi-school">
              <span className="form-label">{tripMessages.studentVerifyFieldSchool}</span>
              <Input
                id="chsi-school"
                value={values.school}
                maxLength={60}
                aria-invalid={errors.school !== undefined}
                status={errors.school === undefined ? undefined : 'error'}
                placeholder={tripMessages.studentVerifyFieldSchoolHint}
                onChange={(event) => update({ school: event.target.value })}
                onPressEnter={submit}
              />
              {errors.school !== undefined && (
                <Typography.Text type="danger">{errors.school}</Typography.Text>
              )}
            </label>

            <label className="form-field" htmlFor="chsi-code">
              <span className="form-label">{tripMessages.studentVerifyFieldCode}</span>
              <Input
                id="chsi-code"
                value={values.code}
                maxLength={12}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={errors.code !== undefined}
                status={errors.code === undefined ? undefined : 'error'}
                placeholder={tripMessages.studentVerifyFieldCodeHint}
                onChange={(event) => update({ code: event.target.value })}
                onPressEnter={submit}
              />
              {errors.code !== undefined && (
                <Typography.Text type="danger">{errors.code}</Typography.Text>
              )}
            </label>

            {actionError !== null && (
              <Alert type="error" showIcon title={tripMessages.studentVerifyFailed} description={actionError} />
            )}

            <Button
              type="primary"
              size="large"
              block
              loading={submitting}
              disabled={token === null}
              onClick={submit}
            >
              {submitting ? tripMessages.studentVerifySubmitting : tripMessages.studentVerifySubmit}
            </Button>
          </section>
        </div>
      )}
    </main>
  );
}
