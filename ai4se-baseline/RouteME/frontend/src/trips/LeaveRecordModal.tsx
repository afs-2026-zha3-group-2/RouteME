import { useEffect, useRef, useState } from 'react';
import { Button, Image, Modal, Skeleton, Typography } from 'antd';
import { ApiError, fetchLeaveEvidence, loadLeaveRecords } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { applicationCancelCause } from '../mine/mineTrips';
import type { LeaveReason, LeaveRecord, TripApplication } from '../types';
import { applicationLabel } from './applicationStatus';
import { LEAVE_REASON_OPTIONS } from './leavePreview';

type Props = {
  open: boolean;
  userId: number;
  tripId: number;
  title?: string;
  /** 该行程我自己的全部申请（含当前这次），按申请时间倒序。 */
  history: TripApplication[];
  onClose: () => void;
};

type TimelineEvent =
  | { kind: 'apply'; at: string; application: TripApplication; ordinal: number }
  | { kind: 'leave'; at: string; record: LeaveRecord; ordinal: number };

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

function timeOf(iso: string): number {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * 申请与退出混排成一条时间线：申请序号按该行程的申请次数，退出序号按退出次数，
 * 两边都保留全局编号，最新事件排在最上面。
 */
function mergeEvents(history: TripApplication[], records: LeaveRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...history.map((application, index) => ({
      kind: 'apply' as const,
      at: application.created_at,
      application,
      ordinal: history.length - index,
    })),
    ...records.map((record, index) => ({
      kind: 'leave' as const,
      at: record.exit_at,
      record,
      ordinal: records.length - index,
    })),
  ];
  return events.sort((left, right) => timeOf(right.at) - timeOf(left.at));
}

/** 退出事件通过 application_id 关联到对应那次申请；旧数据关联不上时返回 null。 */
function relatedApplyOrdinal(
  history: TripApplication[],
  applicationId: number | null | undefined,
): number | null {
  if (applicationId === null || applicationId === undefined) {
    return null;
  }
  const index = history.findIndex((item) => item.id === applicationId);
  return index === -1 ? null : history.length - index;
}

function cancelCloseNote(application: TripApplication): string | null {
  const cause = applicationCancelCause(application);
  if (cause === 'trip_cancelled') {
    return tripMessages.recordApplyClosedByTrip;
  }
  if (cause === 'trip_completed') {
    return tripMessages.recordApplyClosedByCompletion;
  }
  return null;
}

/**
 * 「我的旅行 → 我申请的」的同行记录：申请与退出按同一时间线倒序展示；只读。
 * 图片通过带用户头的请求取回后转 object URL，避免 <img> 无法发送 X-User-Id。
 */
export function TripRecordModal({ open, userId, tripId, title, history, onClose }: Props) {
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
        if (code === 'LEAVE_RECORD_NOT_FOUND') {
          // 从未退出过的行程也会有申请记录：无退出事件不算错误。
          setRecords([]);
          return;
        }
        setError(tripMessages.leaveRecordLoadFailed);
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

  const events = mergeEvents(history, records);
  const applyTotal = history.length;
  const leaveTotal = records.length;
  const countText =
    leaveTotal > 0
      ? `${tripMessages.mineAppliedSummaryTotal.replace('{n}', String(applyTotal))} · ${tripMessages.leaveRecordCount.replace('{n}', String(leaveTotal))}`
      : tripMessages.mineAppliedSummaryTotal.replace('{n}', String(applyTotal));

  return (
    <Modal
      open={open}
      title={tripMessages.recordTitle}
      footer={null}
      onCancel={onClose}
      width={520}
    >
      {title !== undefined && title !== '' && (
        <Typography.Paragraph type="secondary">《{title}》</Typography.Paragraph>
      )}
      {loading && <Skeleton active paragraph={{ rows: 3 }} />}
      {error !== null && <Typography.Text type="danger">{error}</Typography.Text>}
      {!loading && error === null && events.length === 0 && (
        <Typography.Text type="secondary">{tripMessages.recordEmpty}</Typography.Text>
      )}
      {!loading && events.length > 0 && (
        <div className="leave-record" data-leave-record>
          <p className="leave-record-count">{countText}</p>
          {events.map((event, index) => {
            if (event.kind === 'apply') {
              const closeNote = cancelCloseNote(event.application);
              return (
                <section
                  className="leave-record-item"
                  key={`apply-${event.application.id}`}
                  data-apply-record-item
                >
                  <h4 className="leave-record-item-head">
                    <span>
                      {tripMessages.recordApplyTimes.replace('{n}', String(event.ordinal))}
                    </span>
                    <span className="hint">{formatTime(event.at)}</span>
                  </h4>
                  <dl>
                    <div>
                      <dt>{tripMessages.recordApplyStatus}</dt>
                      <dd>
                        <span className="badge muted">
                          {applicationLabel(event.application.status)}
                        </span>
                        {closeNote !== null && <span className="hint">{closeNote}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt>{tripMessages.recordApplyMessage}</dt>
                      <dd>
                        {event.application.message === null || event.application.message === ''
                          ? tripMessages.leaveRecordNoteEmpty
                          : event.application.message}
                      </dd>
                    </div>
                    <div>
                      <dt>{tripMessages.recordApplyDecidedAt}</dt>
                      <dd>
                        {event.application.decided_at === null
                          ? '—'
                          : formatTime(event.application.decided_at)}
                      </dd>
                    </div>
                  </dl>
                </section>
              );
            }
            const related = relatedApplyOrdinal(history, event.record.application_id);
            return (
              <section
                className="leave-record-item"
                key={`leave-${event.record.exit_at}-${index}`}
                data-leave-record-item
              >
                <h4 className="leave-record-item-head">
                  <span>{tripMessages.leaveRecordTimes.replace('{n}', String(event.ordinal))}</span>
                  <span className="hint">{formatTime(event.at)}</span>
                </h4>
                <dl>
                  <div>
                    <dt>{tripMessages.leaveRecordReason}</dt>
                    <dd>
                      <span className="badge muted">{reasonLabel(event.record.reason)}</span>
                      {related !== null && (
                        <span className="hint">
                          {tripMessages.recordLeaveRelatedApply.replace('{n}', String(related))}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{tripMessages.leaveRecordNote}</dt>
                    <dd>
                      {event.record.note === null || event.record.note === ''
                        ? tripMessages.leaveRecordNoteEmpty
                        : event.record.note}
                    </dd>
                  </div>
                  <div>
                    <dt>{tripMessages.leaveRecordImpact}</dt>
                    <dd>
                      {impactText(event.record)}
                      {event.record.monthly_ordinal > 0 && (
                        <span className="hint">
                          {tripMessages.leaveRecordMonthly.replace(
                            '{ordinal}',
                            String(event.record.monthly_ordinal),
                          )}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{tripMessages.leaveRecordAttachments}</dt>
                    <dd>
                      {event.record.attachments.length === 0 && (
                        <span className="hint">{tripMessages.leaveRecordAttachmentsEmpty}</span>
                      )}
                      {event.record.attachments.length > 0 && (
                        <Image.PreviewGroup>
                          <div className="leave-record-images">
                            {event.record.attachments.map((item) =>
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
            );
          })}
          <Button block onClick={onClose}>
            {tripMessages.leaveRecordClose}
          </Button>
        </div>
      )}
    </Modal>
  );
}
