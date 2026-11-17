import { useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Typography } from 'antd';
import { submitReport } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { ReportReason } from '../types';

type Props = {
  userId: number;
  open: boolean;
  targetType: 'trip' | 'user';
  targetId: number;
  targetLabel: string;
  onClose: () => void;
};

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: tripMessages.reportReasonHarassment },
  { value: 'fake', label: tripMessages.reportReasonFake },
  { value: 'safety', label: tripMessages.reportReasonSafety },
  { value: 'other', label: tripMessages.reportReasonOther },
];

const MAX_NOTE_LENGTH = 200;

export function ReportModal({
  userId,
  open,
  targetType,
  targetId,
  targetLabel,
  onClose,
}: Props) {
  const [reason, setReason] = useState<ReportReason>('safety');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState(false);

  const close = () => {
    setReceived(false);
    setError(null);
    setNote('');
    onClose();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const receipt = await submitReport(userId, {
        target_type: targetType,
        target_id: targetId,
        reason,
        note: note.trim() === '' ? null : note.trim(),
      });
      if (!receipt.received) {
        throw new Error('REPORT_NOT_RECEIVED');
      }
      setReceived(true);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={targetType === 'trip' ? tripMessages.reportEntryTrip : tripMessages.reportEntryUser}
      okText={tripMessages.reportSubmit}
      cancelText={tripMessages.createCancel}
      confirmLoading={submitting}
      onOk={submit}
      onCancel={close}
      footer={
        received ? (
          <Button type="primary" onClick={close}>
            {tripMessages.reportClose}
          </Button>
        ) : undefined
      }
    >
      <Space orientation="vertical" size="small" className="home-stack">
        <Typography.Text type="secondary">
          {`${tripMessages.reportTargetPrefix}${targetLabel}。`}
        </Typography.Text>
        <Typography.Text type="secondary">{tripMessages.reportPrivacyNote}</Typography.Text>
        <Typography.Text type="secondary">{tripMessages.reportEmergencyNote}</Typography.Text>
        {received ? (
          <Alert type="success" showIcon title={tripMessages.reportSuccess} />
        ) : (
          <>
            <Typography.Text>{tripMessages.reportReasonLabel}</Typography.Text>
            <Select
              value={reason}
              options={REASON_OPTIONS}
              onChange={(value) => setReason(value)}
              aria-label={tripMessages.reportReasonLabel}
            />
            <Typography.Text>{tripMessages.reportNoteLabel}</Typography.Text>
            <Input.TextArea
              value={note}
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              showCount
              onChange={(event) => setNote(event.target.value)}
            />
            {error !== null && (
              <Alert type="error" showIcon title={tripMessages.reportFailed} description={error} />
            )}
          </>
        )}
      </Space>
    </Modal>
  );
}