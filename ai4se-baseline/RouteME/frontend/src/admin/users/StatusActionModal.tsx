import { useEffect, useState } from 'react';
import { Alert, Button, DatePicker, Input, Modal, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { changeUserStatus } from '../../api';
import { adminMessages } from '../../i18n/adminMessages';
import { SoftSelect } from '../../shell/SoftSelect';
import { appDatePickerUpProps } from '../../utils/datePickerProps';
import type { AdminStatusAction, AdminUserDetail, BanReasonCode } from '../../types';
import { BAN_REASON_OPTIONS } from '../banReasons';
import { adminErrorText, isStaleAdminError } from '../adminFormat';
import { effectiveAccountStatus } from '../adminStatus';
import {
  emptyUserActionForm,
  toStatusRequest,
  validateUserAction,
  type UserActionFormErrors,
  type UserActionFormState,
} from './userActionForm';

type Props = {
  token: string;
  user: AdminUserDetail;
  action: AdminStatusAction;
  open: boolean;
  onCancel: () => void;
  onSaved: (detail: AdminUserDetail) => void;
};

function titleFor(action: AdminStatusAction, status: string): string {
  if (action === 'SUSPEND') {
    return adminMessages.statusModalSuspendTitle;
  }
  if (action === 'BAN') {
    return status === 'BANNED'
      ? adminMessages.statusModalUpdateBanTitle
      : adminMessages.statusModalBanTitle;
  }
  return adminMessages.statusModalRestoreTitle;
}

/** 暂停 / 封禁 / 恢复：二次确认 + 理由 + 8 项封禁理由 + 未来解封时间。 */
export function StatusActionModal({ token, user, action, open, onCancel, onSaved }: Props) {
  const effective = effectiveAccountStatus(user.status, user.ban_expires_at, Date.now());
  const [form, setForm] = useState<UserActionFormState>(() => emptyUserActionForm(action));
  const [errors, setErrors] = useState<UserActionFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyUserActionForm(action));
      setErrors({});
      setSubmitError(null);
    }
  }, [action, open]);

  const update = (patch: Partial<UserActionFormState>) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  const submit = async () => {
    const now = Date.now();
    const found = validateUserAction(form, now);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await changeUserStatus(token, user.id, toStatusRequest(form));
      message.success(
        action === 'SUSPEND'
          ? adminMessages.statusSuccessSuspend
          : action === 'BAN'
            ? effective === 'BANNED'
              ? adminMessages.statusSuccessUpdateBan
              : adminMessages.statusSuccessBan
            : adminMessages.statusSuccessRestore,
      );
      onSaved(updated);
      onCancel();
    } catch (caught: unknown) {
      const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
      if (isStaleAdminError(code)) {
        message.warning(adminErrorText(code));
        onCancel();
      } else {
        setSubmitError(adminErrorText(code));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={titleFor(action, effective)}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {adminMessages.cancel}
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger={action === 'BAN'}
          loading={submitting}
          onClick={submit}
        >
          {adminMessages.statusConfirm}
        </Button>,
      ]}
    >
      <p className="admin-modal-intro">
        {adminMessages.statusModalIntroPrefix}
        <b>{user.nickname}</b>
        {adminMessages.statusModalIntroSuffix}
      </p>

      {submitError !== null && (
        <Alert type="error" showIcon title={adminMessages.statusFailed} description={submitError} />
      )}

      <div className="admin-form">
        <label className="form-label" htmlFor="status-reason">
          {adminMessages.fieldReason}
        </label>
        <Input.TextArea
          id="status-reason"
          value={form.reason}
          rows={3}
          maxLength={200}
          placeholder={
            action === 'RESTORE' ? undefined : adminMessages.fieldReasonHint
          }
          onChange={(event) => update({ reason: event.target.value })}
        />
        {action !== 'RESTORE' && (
          <Typography.Text type="secondary" className="admin-form-hint">
            {adminMessages.fieldReasonHint}
          </Typography.Text>
        )}
        {errors.reason !== undefined && (
          <Typography.Text type="danger">{errors.reason}</Typography.Text>
        )}

        {action === 'BAN' && (
          <>
            <label className="form-label">{adminMessages.fieldBanReason}</label>
            <SoftSelect
              value={form.banReasonCode}
              options={BAN_REASON_OPTIONS}
              onChange={(value) =>
                update({ banReasonCode: value === '' ? '' : (value as BanReasonCode) })
              }
              ariaLabel={adminMessages.fieldBanReason}
            />
            {errors.banReasonCode !== undefined && (
              <Typography.Text type="danger">{errors.banReasonCode}</Typography.Text>
            )}

            <label className="form-label" htmlFor="status-ban-note">
              {adminMessages.fieldBanNote}
            </label>
            <Input.TextArea
              id="status-ban-note"
              value={form.banReasonNote}
              rows={2}
              maxLength={200}
              placeholder={adminMessages.fieldBanNoteHint}
              onChange={(event) => update({ banReasonNote: event.target.value })}
            />
            {errors.banReasonNote !== undefined && (
              <Typography.Text type="danger">{errors.banReasonNote}</Typography.Text>
            )}

            <div className="form-field">
              <label className="form-label" htmlFor="status-ban-expires">
                {adminMessages.fieldBanExpiresAt}
              </label>
              <DatePicker
                {...appDatePickerUpProps}
                id="status-ban-expires"
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                value={form.banExpiresAt === '' ? null : dayjs(form.banExpiresAt)}
                onChange={(value) =>
                  update({ banExpiresAt: value === null ? '' : value.toISOString() })
                }
              />
              <Typography.Text type="secondary" className="admin-form-hint">
                {adminMessages.fieldBanExpiresAtHint}
              </Typography.Text>
              {errors.banExpiresAt !== undefined && (
                <Typography.Text type="danger">{errors.banExpiresAt}</Typography.Text>
              )}
            </div>
          </>
        )}
      </div>

      <p className="admin-modal-note">{adminMessages.statusSelfHint}</p>
    </Modal>
  );
}