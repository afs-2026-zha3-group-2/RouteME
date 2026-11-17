import { useEffect, useRef, useState } from 'react';
import { Modal, Skeleton, Typography, message } from 'antd';
import { ApiError, leaveTrip, loadLeavePreview } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { LeavePreview, LeaveReason, LeaveResult } from '../types';
import { LEAVE_REASON_OPTIONS, leavePreviewText } from './leavePreview';

type Props = {
  open: boolean;
  userId: number;
  tripId: number;
  title?: string;
  onClose: () => void;
  onLeft: (result: LeaveResult) => void;
};

/**
 * 退出同行弹窗：原因必选；选择后由服务端计算预计信用影响；确认后展示实际结果。
 * 三个入口（详情 / 我的旅行 / 聊天）共用。
 */
export function TripLeaveModal({ open, userId, tripId, title, onClose, onLeft }: Props) {
  const [reason, setReason] = useState<LeaveReason | undefined>(undefined);
  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    if (open) {
      setReason(undefined);
      setPreview(null);
      setPreviewLoading(false);
      setPreviewError(null);
      setSubmitting(false);
      setError(null);
      sequence.current += 1;
    }
  }, [open]);

  useEffect(() => {
    if (!open || reason === undefined) {
      return;
    }
    const current = sequence.current + 1;
    sequence.current = current;
    setPreviewLoading(true);
    setPreviewError(null);
    loadLeavePreview(userId, tripId, reason)
      .then((loaded) => {
        if (sequence.current === current) {
          setPreview(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (sequence.current !== current) {
          return;
        }
        const code = caught instanceof ApiError ? caught.code : 'UNKNOWN_ERROR';
        setPreviewError(code === 'CREDIT_RESTRICTED' ? tripMessages.leaveRestricted : tripMessages.leaveFailed);
      })
      .finally(() => {
        if (sequence.current === current) {
          setPreviewLoading(false);
        }
      });
  }, [open, reason, tripId, userId]);

  const submit = async () => {
    if (reason === undefined) {
      setError(tripMessages.leaveReasonRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await leaveTrip(userId, tripId, reason);
      message.success(
        tripMessages.leaveSuccessWithScore
          .replace('{before}', String(result.credit_score - result.applied_delta))
          .replace('{after}', String(result.credit_score)),
      );
      onLeft(result);
      onClose();
    } catch (caught: unknown) {
      const code = caught instanceof ApiError ? caught.code : 'UNKNOWN_ERROR';
      if (code === 'CREDIT_RESTRICTED') {
        setError(tripMessages.leaveRestricted);
      } else if (code === 'TRIP_NOT_OPEN') {
        setError(tripMessages.applyEnded);
      } else {
        setError(tripMessages.leaveFailed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={tripMessages.leaveTrip}
      okText={tripMessages.leaveTrip}
      cancelText={tripMessages.createCancel}
      confirmLoading={submitting}
      okButtonProps={{ danger: true }}
      onOk={() => void submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph type="warning">
        {title === undefined || title === '' ? '' : `《${title}》`}
        退出后名额会释放；已匹配关系解除，聊天记录保留。请先确认本次信用影响。
      </Typography.Paragraph>
      <label className="field">
        <span className="label">{tripMessages.leaveReasonLabel}</span>
        {/* 原生 select：与取消行程一致，规避 Edge / antd 浮层兼容问题。 */}
        <select
          className="native-select leave-reason-select"
          data-leave-reason
          value={reason ?? ''}
          onChange={(event) => {
            setReason(event.target.value === '' ? undefined : (event.target.value as LeaveReason));
            setPreview(null);
            setPreviewError(null);
            setError(null);
          }}
        >
          <option value="" disabled>
            {tripMessages.leaveReasonLabel}
          </option>
          {LEAVE_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {previewLoading && <Skeleton active paragraph={{ rows: 1 }} />}
      {previewError !== null && <Typography.Text type="danger">{previewError}</Typography.Text>}
      {preview !== null && !previewLoading && (
        <div className="leave-preview" data-leave-preview>
          <span className="leave-preview-label">{tripMessages.leavePreviewTitle}</span>
          <b>{leavePreviewText(preview)}</b>
          {preview.message_code === 'pending_review' && (
            <span className="hint">退出后进入待核实；核实前不扣分，也不计入当月次数。</span>
          )}
        </div>
      )}
      {reason === 'safety' && (
        <Typography.Paragraph type="secondary">{tripMessages.leaveSafetyHint}</Typography.Paragraph>
      )}
      {error !== null && <Typography.Text type="danger">{error}</Typography.Text>}
    </Modal>
  );
}
