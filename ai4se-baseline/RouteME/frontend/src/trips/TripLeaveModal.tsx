import { useEffect, useRef, useState } from 'react';
import { Input, Modal, Skeleton, Typography, message } from 'antd';
import {
  ApiError,
  leaveTrip,
  loadLeavePreview,
  uploadLeaveEvidence,
} from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { LeavePreview, LeaveReason, LeaveResult } from '../types';
import { LEAVE_REASON_OPTIONS, leavePreviewText } from './leavePreview';
import {
  LEAVE_EVIDENCE_MAX,
  canSubmitLeave,
  leaveNoteRequired,
  validateLeaveEvidence,
} from './leaveForm';

type Props = {
  open: boolean;
  userId: number;
  tripId: number;
  title?: string;
  onClose: () => void;
  onLeft: (result: LeaveResult) => void;
};

type EvidenceItem = { file: File; url: string };

/**
 * 退出同行弹窗：原因必选；安全原因 / 不可抗力必须填写退出说明；
 * 三种原因都可附证明材料（≤3 张）；确认前展示预计信用影响。
 * 三个入口（详情 / 我的旅行 / 聊天）共用。
 */
export function TripLeaveModal({ open, userId, tripId, title, onClose, onLeft }: Props) {
  const [reason, setReason] = useState<LeaveReason | undefined>(undefined);
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const evidenceRef = useRef<EvidenceItem[]>([]);

  const revoke = (items: EvidenceItem[]) => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
  };

  useEffect(() => {
    evidenceRef.current = evidence;
  }, [evidence]);

  useEffect(
    () => () => {
      revoke(evidenceRef.current);
    },
    [],
  );

  useEffect(() => {
    if (open) {
      setReason(undefined);
      setNote('');
      setEvidence((previous) => {
        revoke(previous);
        return [];
      });
      setEvidenceError(null);
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
    if (leaveNoteRequired(reason) && note.trim() === '') {
      setError(tripMessages.leaveNoteRequiredError);
      return;
    }
    setSubmitting(true);
    setError(null);
    setEvidenceError(null);
    let attachmentIds: number[];
    try {
      attachmentIds = [];
      for (const item of evidence) {
        const uploaded = await uploadLeaveEvidence(userId, tripId, item.file);
        attachmentIds.push(uploaded.id);
      }
    } catch {
      setError(tripMessages.leaveEvidenceUploadFailed);
      setSubmitting(false);
      return;
    }
    try {
      const result = await leaveTrip(userId, tripId, {
        reason,
        note: note.trim() === '' ? null : note.trim(),
        attachment_ids: attachmentIds,
      });
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
      } else if (code === 'INVALID_INPUT') {
        setError(tripMessages.leaveInvalidInput);
      } else {
        setError(tripMessages.leaveFailed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addEvidence = (files: FileList | null) => {
    if (files === null || files.length === 0) {
      return;
    }
    const next: EvidenceItem[] = [];
    let failure: string | null = null;
    for (const file of Array.from(files)) {
      if (evidence.length + next.length >= LEAVE_EVIDENCE_MAX) {
        failure = tripMessages.leaveEvidenceTooMany;
        break;
      }
      const invalid = validateLeaveEvidence(file);
      if (invalid !== null) {
        failure = invalid;
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    if (next.length > 0) {
      setEvidence((previous) => [...previous, ...next]);
    }
    setEvidenceError(failure);
  };

  const removeEvidence = (index: number) => {
    setEvidence((previous) => {
      const target = previous[index];
      if (target !== undefined) {
        URL.revokeObjectURL(target.url);
      }
      return previous.filter((_, current) => current !== index);
    });
    setEvidenceError(null);
  };

  const noteRequired = leaveNoteRequired(reason);
  const canSubmit = canSubmitLeave(reason, note) && !submitting;

  return (
    <Modal
      open={open}
      title={tripMessages.leaveTrip}
      okText={tripMessages.leaveTrip}
      cancelText={tripMessages.createCancel}
      confirmLoading={submitting}
      okButtonProps={{ danger: true, disabled: !canSubmit }}
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
            {tripMessages.leaveReasonPlaceholder}
          </option>
          {LEAVE_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field leave-note">
        <span className="label">
          {tripMessages.leaveNoteLabel}
          <span className="opt">
            {noteRequired ? tripMessages.leaveNoteRequired : tripMessages.leaveNoteOptional}
          </span>
        </span>
        <Input.TextArea
          className="textarea"
          data-leave-note
          value={note}
          rows={3}
          maxLength={200}
          showCount
          placeholder={tripMessages.leaveNotePlaceholder}
          onChange={(event) => setNote(event.target.value)}
        />
        <span className="hint">{tripMessages.leaveNoteHint}</span>
      </label>

      <div className="field leave-evidence">
        <span className="label">
          {tripMessages.leaveEvidenceLabel}
          <span className="opt">{tripMessages.leaveEvidenceHint}</span>
        </span>
        <div className="leave-evidence-list">
          {evidence.map((item, index) => (
            <span className="leave-evidence-item" key={item.url}>
              <img src={item.url} alt="" />
              <button
                type="button"
                className="leave-evidence-remove"
                aria-label={tripMessages.leaveEvidenceRemove}
                onClick={() => removeEvidence(index)}
              >
                ×
              </button>
            </span>
          ))}
          {evidence.length < LEAVE_EVIDENCE_MAX && (
            <span className="leave-evidence-add">
              {tripMessages.leaveEvidenceAdd}
              <input
                type="file"
                className="leave-evidence-input"
                accept="image/jpeg,image/png,image/webp"
                multiple
                data-leave-evidence
                onChange={(event) => {
                  addEvidence(event.target.files);
                  event.target.value = '';
                }}
              />
            </span>
          )}
        </div>
        {evidenceError !== null && <span className="hint danger">{evidenceError}</span>}
      </div>

      {previewLoading && <Skeleton active paragraph={{ rows: 1 }} />}
      {previewError !== null && <Typography.Text type="danger">{previewError}</Typography.Text>}
      {preview !== null && !previewLoading && (
        <div className="leave-preview" data-leave-preview>
          <span className="leave-preview-label">{tripMessages.leavePreviewTitle}</span>
          <b>{leavePreviewText(preview)}</b>
        </div>
      )}
      {reason === 'safety' && (
        <Typography.Paragraph type="secondary">{tripMessages.leaveSafetyHint}</Typography.Paragraph>
      )}
      {error !== null && <Typography.Text type="danger">{error}</Typography.Text>}
    </Modal>
  );
}
