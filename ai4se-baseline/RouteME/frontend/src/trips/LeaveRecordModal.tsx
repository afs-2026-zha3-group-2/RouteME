import { useEffect, useRef, useState } from 'react';
import { Button, Image, Modal, Skeleton, Typography } from 'antd';
import { ApiError, fetchLeaveEvidence, loadLeaveRecords } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { LeaveReason, LeaveRecord } from '../types';
import { LEAVE_REASON_OPTIONS } from './leavePreview';

type Props = {
  open: boolean;
  userId: number;
  tripId: number;
  title?: string;
  onClose: () => void;
};

function reasonLabel(reason: LeaveReason): string {
  return LEAVE_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? reason;
}

function impactText(record: LeaveRecord): string {
  if (record.review_status === 'pending') {
    return tripMessages.leaveRecordImpactPending;
  }
  if (record.review_status === 'verified_true') {
    return tripMessages.leaveRecordImpactVerifiedTrue;
  }
  const delta = tripMessages.leaveRecordDelta
    .replace('{theoretical}', String(record.theoretical_delta))
    .replace('{applied}', String(record.applied_delta));
  if (record.review_status === 'verified_false') {
    return `${tripMessages.leaveRecordImpactVerifiedFalse}；${delta}`;
  }
  return `${tripMessages.leaveRecordImpactSettled}；${delta}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

/**
 * 本人查看自己的退出记录（同一行程可多次退出）：原因、说明、时间、信用影响与证明材料；只读。
 * 图片通过带用户头的请求取回后转 object URL，避免 <img> 无法发送 X-User-Id。
 */
export function LeaveRecordModal({ open, userId, tripId, title, onClose }: Props) {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    setRecords([]);
    setImages({});
    setError(null);
    setLoading(true);

    loadLeaveRecords(userId, tripId)
      .then(async (loaded) => {
        const urls: Record<number, string> = {};
        for (const record of loaded) {
          for (const item of record.attachments) {
            try {
              const blob = await fetchLeaveEvidence(userId, item.id);
              const url = URL.createObjectURL(blob);
              urls[item.id] = url;
              urlsRef.current.push(url);
            } catch {
              // 单张图片读取失败不影响整条记录展示。
            }
          }
        }
        if (!cancelled) {
          setRecords(loaded);
          setImages(urls);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        const code = caught instanceof ApiError ? caught.code : '';
        setError(
          code === 'LEAVE_RECORD_NOT_FOUND'
            ? tripMessages.leaveRecordNotFound
            : tripMessages.leaveRecordLoadFailed,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, [open, tripId, userId]);

  return (
    <Modal
      open={open}
      title={tripMessages.leaveRecordTitle}
      footer={null}
      onCancel={onClose}
      width={520}
    >
      {title !== undefined && title !== '' && (
        <Typography.Paragraph type="secondary">《{title}》</Typography.Paragraph>
      )}
      {loading && <Skeleton active paragraph={{ rows: 3 }} />}
      {error !== null && <Typography.Text type="danger">{error}</Typography.Text>}
      {records.length > 0 && !loading && (
        <div className="leave-record" data-leave-record>
          <p className="leave-record-count">
            {tripMessages.leaveRecordCount.replace('{n}', String(records.length))}
          </p>
          {records.map((record, index) => (
            <section className="leave-record-item" key={`${record.exit_at}-${index}`} data-leave-record-item>
              <h4 className="leave-record-item-head">
                <span>{tripMessages.leaveRecordTimes.replace('{n}', String(records.length - index))}</span>
                <span className="hint">{formatTime(record.exit_at)}</span>
              </h4>
              <dl>
                <div>
                  <dt>{tripMessages.leaveRecordReason}</dt>
                  <dd>
                    <span className="badge muted">{reasonLabel(record.reason)}</span>
                  </dd>
                </div>
                <div>
                  <dt>{tripMessages.leaveRecordNote}</dt>
                  <dd>
                    {record.note === null || record.note === ''
                      ? tripMessages.leaveRecordNoteEmpty
                      : record.note}
                  </dd>
                </div>
                <div>
                  <dt>{tripMessages.leaveRecordImpact}</dt>
                  <dd>
                    {impactText(record)}
                    {record.monthly_ordinal > 0 && (
                      <span className="hint">
                        {tripMessages.leaveRecordMonthly.replace(
                          '{ordinal}',
                          String(record.monthly_ordinal),
                        )}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{tripMessages.leaveRecordAttachments}</dt>
                  <dd>
                    {record.attachments.length === 0 && (
                      <span className="hint">{tripMessages.leaveRecordAttachmentsEmpty}</span>
                    )}
                    {record.attachments.length > 0 && (
                      <Image.PreviewGroup>
                        <div className="leave-record-images">
                          {record.attachments.map((item) =>
                            images[item.id] === undefined ? (
                              <span className="leave-evidence-item" key={item.id} />
                            ) : (
                              <Image
                                key={item.id}
                                src={images[item.id]}
                                alt={item.original_name ?? ''}
                                width={72}
                                height={72}
                              />
                            ),
                          )}
                        </div>
                      </Image.PreviewGroup>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          ))}
          <Button block onClick={onClose}>
            {tripMessages.leaveRecordClose}
          </Button>
        </div>
      )}
    </Modal>
  );
}
