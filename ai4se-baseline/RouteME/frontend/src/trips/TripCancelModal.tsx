import { useEffect, useState } from 'react';
import { Input, Modal, Typography, message } from 'antd';
import { ApiError, cancelTrip } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { TripCancelReason, TripDetail } from '../types';
import { CANCEL_REASON_OPTIONS } from './tripCancel';

type Props = {
  open: boolean;
  userId: number;
  trip: Pick<TripDetail, 'id' | 'title'>;
  onClose: () => void;
  onCancelled: (trip: TripDetail) => void;
};

const MAX_NOTE_LENGTH = 100;

/**
 * 取消行程弹窗：原因必选，「其他原因」说明必填 1–100 字；
 * 提交前展示不可恢复与申请 / 同行者影响。
 */
export function TripCancelModal({ open, userId, trip, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState<TripCancelReason | undefined>(undefined);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason(undefined);
      setNote('');
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (reason === undefined) {
      setError(tripMessages.cancelReasonRequired);
      return;
    }
    const trimmed = note.trim();
    if (reason === 'other' && (trimmed === '' || trimmed.length > MAX_NOTE_LENGTH)) {
      setError(tripMessages.cancelNoteRequired);
      return;
    }
    if (trimmed.length > MAX_NOTE_LENGTH) {
      setError(tripMessages.cancelNoteTooLong);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await cancelTrip(userId, trip.id, {
        reason,
        note: trimmed === '' ? null : trimmed,
      });
      message.success(tripMessages.cancelSuccess);
      onCancelled(updated);
      onClose();
    } catch (caught: unknown) {
      const code = caught instanceof ApiError ? caught.code : 'UNKNOWN_ERROR';
      if (code === 'FORBIDDEN') {
        setError(tripMessages.detailCancelForbidden);
      } else if (code === 'TRIP_NOT_OPEN') {
        setError(tripMessages.cancelNotOpen);
      } else {
        setError(tripMessages.cancelFailed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={tripMessages.detailCancelTrip}
      okText={tripMessages.cancelSubmit}
      cancelText={tripMessages.createCancel}
      confirmLoading={submitting}
      okButtonProps={{ danger: true }}
      onOk={() => void submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph type="warning">{tripMessages.cancelImpact}</Typography.Paragraph>
      <label className="field">
        <span className="label">{tripMessages.cancelReasonLabel}</span>
        {/*
         * Native select on purpose: antd 6.7 renders its popup off-screen when the OS asks for
         * reduced motion (`prefers-reduced-motion: reduce`), so the option list never shows.
         */}
        <select
          className="native-select cancel-reason-select"
          data-cancel-reason
          value={reason ?? ''}
          onChange={(event) => {
            setReason(
              event.target.value === '' ? undefined : (event.target.value as TripCancelReason),
            );
            setError(null);
          }}
        >
          <option value="" disabled>
            {tripMessages.cancelReasonPlaceholder}
          </option>
          {CANCEL_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">
          {tripMessages.cancelNoteLabel}
          <span className="opt">{tripMessages.cancelNoteHint}</span>
        </span>
        <Input.TextArea
          className="textarea"
          value={note}
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          showCount
          placeholder={tripMessages.cancelNotePlaceholder}
          onChange={(event) => {
            setNote(event.target.value);
            setError(null);
          }}
        />
      </label>
      {error !== null && <Typography.Text type="danger">{error}</Typography.Text>}
    </Modal>
  );
}
