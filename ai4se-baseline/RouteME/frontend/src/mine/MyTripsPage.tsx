import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Segmented, Skeleton, Typography, message } from 'antd';
import { cityLabel } from '../area/areaOptions';
import { cancelApplication, completeTrip, loadMyExperiences, loadMyTrips, loadTrip } from '../api';
import { mineMeetingNote } from '../chat/chatMeeting';
import { tripMessages } from '../i18n/tripMessages';
import { useMyCredit } from '../credit/CreditContext';
import { EmptyState } from '../shell/EmptyState';
import { applicationLabel } from '../trips/applicationStatus';
import { cityPhoto } from '../trips/cityPhotos';
import { coverTone } from '../trips/coverTone';
import { StatusBadge } from '../trips/StatusBadge';
import { StopCompletionPicker } from '../trips/StopCompletionPicker';
import { allChecked } from '../trips/stopCompletion';
import { TripCancelModal } from '../trips/TripCancelModal';
import { TripRecordModal } from '../trips/LeaveRecordModal';
import { TripLeaveModal } from '../trips/TripLeaveModal';
import type {
  AppliedTripGroup,
  DemoUser,
  Experience,
  MyTrips,
  TripApplication,
  TripSummary,
} from '../types';
import {
  actionsFor,
  dayLabel,
  formatDateRange,
  groupApplied,
  groupCounts,
  pendingCountFor,
  pendingTargetTripId,
  type MineAction,
  type MineTab,
} from './mineTrips';

type Props = {
  currentUser: DemoUser;
};

type ConfirmAction = { kind: 'complete'; trip: TripSummary; stops: string[] };

function pendingHint(count: number): string {
  return count > 0
    ? tripMessages.minePendingInline.replace('{n}', String(count))
    : tripMessages.minePendingNone;
}

/** 行内摘要：共申请 N 次，非零结果依次追加，避免单次申请时堆砌噪音。 */
function summaryText(group: AppliedTripGroup): string {
  const { counts } = group;
  const parts = [tripMessages.mineAppliedSummaryTotal.replace('{n}', String(counts.total))];
  if (counts.pending > 0) {
    parts.push(tripMessages.mineAppliedSummaryPending.replace('{n}', String(counts.pending)));
  }
  if (counts.rejected > 0) {
    parts.push(tripMessages.mineAppliedSummaryRejected.replace('{n}', String(counts.rejected)));
  }
  if (counts.cancelled > 0) {
    parts.push(tripMessages.mineAppliedSummaryCancelled.replace('{n}', String(counts.cancelled)));
  }
  if (counts.left > 0) {
    parts.push(tripMessages.mineAppliedSummaryLeft.replace('{n}', String(counts.left)));
  }
  return parts.join(' · ');
}

export function MyTripsPage({ currentUser }: Props) {
  const { refresh: refreshCredit } = useMyCredit();
  const [data, setData] = useState<MyTrips | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [tab, setTab] = useState<MineTab>('published');
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [completeChecked, setCompleteChecked] = useState<number[]>([]);
  const [leaveTarget, setLeaveTarget] = useState<TripSummary | null>(null);
  const [recordTarget, setRecordTarget] = useState<{
    trip: TripSummary;
    history: TripApplication[];
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TripSummary | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const reload = useCallback(
    (silent = false): Promise<void> => {
      if (inFlight.current !== null) {
        return inFlight.current;
      }
      const run = (async () => {
        try {
          const [loaded, loadedExperiences] = await Promise.all([
            loadMyTrips(currentUser.id),
            loadMyExperiences(currentUser.id),
          ]);
          setData(loaded);
          setExperiences(loadedExperiences);
          setError(null);
        } catch (caught: unknown) {
          if (!silent) {
            setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
          }
        } finally {
          inFlight.current = null;
        }
      })();
      inFlight.current = run;
      return run;
    },
    [currentUser.id],
  );

  useEffect(() => {
    void reload(false);
  }, [reload]);

  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === 'visible') {
        void reload(true);
      }
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [reload]);

  const handleActionError = (code: string) => {
    if (code === 'TRIP_NOT_OPEN') {
      message.info(tripMessages.applyEnded);
      void reload(true);
      return;
    }
    if (code === 'APPLICATION_NOT_PENDING') {
      message.info(tripMessages.applyStatusCancelled);
      void reload(true);
      return;
    }
    setError(code);
  };

  const runAction = async (
    action: MineAction,
    trip: TripSummary,
    application?: TripApplication,
  ) => {
    if (action === 'view') {
      window.location.hash = `#/trips/${trip.id}`;
      return;
    }
    if (action === 'applications') {
      window.location.hash = `#/trips/${trip.id}/applications`;
      return;
    }
    if (action === 'chat') {
      window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`;
      return;
    }
    if (action === 'share') {
      window.location.hash = `#/share/${trip.id}`;
      return;
    }
    if (action === 'complete') {
      // 摘要卡不带途经点：先拉详情再开弹窗，默认全选。
      setBusyKey(`complete-${trip.id}`);
      try {
        const detail = await loadTrip(currentUser.id, trip.id);
        setCompleteChecked(allChecked(detail.stops));
        setConfirmAction({ kind: 'complete', trip, stops: detail.stops });
      } catch (caught: unknown) {
        handleActionError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      } finally {
        setBusyKey(null);
      }
      return;
    }
    if (action === 'leave') {
      setLeaveTarget(trip);
      return;
    }
    if (action === 'cancelTrip') {
      setCancelTarget(trip);
      return;
    }
    if (action === 'cancel' && application !== undefined) {
      setBusyKey(`cancel-${application.id}`);
      try {
        await cancelApplication(currentUser.id, application.id);
        message.success(tripMessages.applyCancelled);
        await reload(true);
      } catch (caught: unknown) {
        handleActionError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      } finally {
        setBusyKey(null);
      }
    }
  };

  const confirmNow = async () => {
    if (confirmAction === null) {
      return;
    }
    const { trip } = confirmAction;
    setBusyKey(`complete-${trip.id}`);
    try {
      await completeTrip(currentUser.id, trip.id, completeChecked);
      message.success(tripMessages.detailEndedToast);
      setConfirmAction(null);
      await reload(true);
    } catch (caught: unknown) {
      setConfirmAction(null);
      handleActionError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
    } finally {
      setBusyKey(null);
    }
  };

  const counts = data === null ? null : groupCounts(data);
  const sharedTripIds = new Set(experiences.map((experience) => experience.trip.id));
  const pendingTotal = data?.pending_application_count ?? 0;
  const targetTripId = data === null ? null : pendingTargetTripId(data);

  const renderActions = (trip: TripSummary, application?: TripApplication) =>
    actionsFor({ group: tab, trip, application }).map((action) => {
      const key = `${action}-${trip.id}`;
      if (action === 'applications') {
        const pending = data === null ? 0 : pendingCountFor(data, trip.id);
        return (
          <Button
            key={key}
            size="small"
            type={pending > 0 ? 'primary' : 'default'}
            onClick={() => void runAction(action, trip)}
          >
            {pending > 0
              ? `${tripMessages.mineApplications} · ${pending}`
              : tripMessages.mineApplications}
          </Button>
        );
      }
      const shared = sharedTripIds.has(trip.id);
      const labels: Record<Exclude<MineAction, 'applications'>, string> = {
        view: tripMessages.mineView,
        complete: tripMessages.mineCompleteTrip,
        cancel: tripMessages.mineCancelApplication,
        cancelTrip: tripMessages.detailCancelTrip,
        chat: tab === 'applied' ? tripMessages.mineChat : tripMessages.mineContactHost,
        leave: tripMessages.mineLeave,
        share: shared ? tripMessages.experienceEditEntry : tripMessages.experienceShareEntry,
      };
      return (
        <Button
          key={key}
          size="small"
          type={action === 'share' && !shared ? 'primary' : 'default'}
          loading={busyKey === key}
          onClick={() => void runAction(action, trip, application)}
        >
          {labels[action]}
        </Button>
      );
    });

  const renderRow = (
    trip: TripSummary,
    note: string | null,
    application?: TripApplication,
    group?: AppliedTripGroup,
  ) => {
    const destination = cityLabel(trip.destination_code) || trip.destination;
    const photo = cityPhoto(destination, trip.destination);

    return (
      <article className="mine-row" key={`${tab}-${trip.id}`} data-group={tab}>
        <span className={`mr-cover cover-${coverTone(trip.destination_code)}`} aria-hidden="true">
          {photo !== null && (
            <img className="mr-photo" src={photo} alt="" loading="lazy" />
          )}
          <span className="mr-cover-shade" aria-hidden="true" />
          <span className="mr-cover-dest">{destination}</span>
        </span>
        <div className="mr-main">
          <h3 className="mr-title">
            <a href={`#/trips/${trip.id}`}>{trip.title}</a>
            <StatusBadge status={trip.status} />
            {tab === 'published' && trip.ending_soon && (
              <span className="badge amber">{tripMessages.detailEndingSoon}</span>
            )}
          </h3>
          <div className="mr-meta">
            <span>{trip.destination}</span>
            <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            <span>
              {trip.joined_count} / {trip.capacity} {tripMessages.peopleUnit}
            </span>
            <span>{dayLabel(trip.start_date)}</span>
          </div>
          {note !== null && note !== '' && <p className="mr-note">{note}</p>}
          {application !== undefined && (
            <p className="mr-note">
              <span className="badge muted">{applicationLabel(application.status)}</span>
              {group !== undefined && group.counts.total > 1 && (
                <span className="mr-summary">{summaryText(group)}</span>
              )}
            </p>
          )}
        </div>
        <div className="mr-actions">
          {renderActions(trip, application)}
          {tab === 'applied' && application !== undefined && (
            <Button
              size="small"
              onClick={() => setRecordTarget({ trip, history: group?.history ?? [application] })}
            >
              {tripMessages.mineViewRecord}
            </Button>
          )}
        </div>
      </article>
    );
  };

  const renderEmpty = (group: MineTab) => {
    if (group === 'published') {
      return (
        <EmptyState
          title={tripMessages.mineEmptyPublishedTitle}
          text={tripMessages.mineEmptyPublishedText}
        >
          <a className="btn primary" href="#/trips/new">
            {tripMessages.mineEmptyPublishedCta}
          </a>
        </EmptyState>
      );
    }
    if (group === 'applied') {
      return (
        <EmptyState
          title={tripMessages.mineEmptyAppliedTitle}
          text={tripMessages.mineEmptyAppliedText}
        >
          <a className="btn primary" href="#/">
            {tripMessages.mineEmptyAppliedCta}
          </a>
        </EmptyState>
      );
    }
    if (group === 'matched') {
      return (
        <EmptyState
          title={tripMessages.mineEmptyMatchedTitle}
          text={tripMessages.mineEmptyMatchedText}
        >
          <a className="btn primary" href="#/">
            {tripMessages.mineEmptyMatchedCta}
          </a>
        </EmptyState>
      );
    }
    return (
      <EmptyState
        title={tripMessages.mineEmptyCompletedTitle}
        text={tripMessages.mineEmptyCompletedText}
      />
    );
  };

  const renderRows = () => {
    if (data === null) {
      return null;
    }
    if (tab === 'published') {
      if (data.published.length === 0) {
        return renderEmpty('published');
      }
      return (
        <div className="mine-list">
          {data.published.map((trip) => {
            let note: string | null = null;
            if (trip.status === 'ongoing') {
              note = tripMessages.mineNoteOngoing;
            } else if (trip.status === 'cancelled') {
              note = '行程已取消，不再展示在灵感首页。';
            } else if (trip.status === 'completed') {
              note = sharedTripIds.has(trip.id)
                ? tripMessages.mineNoteShared
                : tripMessages.mineNoteNoExperience;
            }
            return renderRow(trip, note);
          })}
        </div>
      );
    }
    if (tab === 'applied') {
      const groups = groupApplied(data.applied);
      if (groups.length === 0) {
        return renderEmpty('applied');
      }
      return (
        <div className="mine-list">
          {groups.map((group) =>
            renderRow(
              group.latest.trip,
              group.latest.message ?? tripMessages.applicationsNoMessage,
              group.latest,
              group,
            ),
          )}
        </div>
      );
    }
    if (tab === 'matched') {
      if (data.matched.length === 0) {
        return renderEmpty('matched');
      }
      return (
        <div className="mine-list">
          {data.matched.map((trip) =>
            renderRow(
              trip,
              mineMeetingNote(trip.meeting_areas, trip.meeting_time, trip.joined_count),
            ),
          )}
        </div>
      );
    }
    if (data.completed.length === 0) {
      return renderEmpty('completed');
    }
    return (
      <div className="mine-list">
        {data.completed.map((trip) =>
          renderRow(
            trip,
            sharedTripIds.has(trip.id) ? tripMessages.mineNoteShared : tripMessages.mineNoteCompleted,
          ),
        )}
      </div>
    );
  };

  const tabs = [
    { value: 'published' as MineTab, label: tripMessages.minePublished },
    { value: 'applied' as MineTab, label: tripMessages.mineApplied },
    { value: 'matched' as MineTab, label: tripMessages.mineMatched },
    { value: 'completed' as MineTab, label: tripMessages.mineCompleted },
  ];

  if (error !== null && data === null) {
    return (
      <main className="trip-page">
        <Alert
          type="error"
          showIcon
          title={tripMessages.failedTitle}
          description={error}
          action={<Button onClick={() => void reload(false)}>{tripMessages.retry}</Button>}
        />
      </main>
    );
  }

  return (
    <main className="trip-page">
      <div className="page-stack">
        <section className="page-head">
          <div>
            <h1 className="page-title">{tripMessages.mineTitle}</h1>
            <p className="page-sub">
              {tripMessages.mineSubtitle}
              {data !== null && ` ${pendingHint(pendingTotal)}`}
            </p>
          </div>
          <a className="btn primary page-head-cta" href="#/trips/new">
            {tripMessages.publish}
          </a>
        </section>

        {data !== null && pendingTotal > 0 && targetTripId !== null && (
          <Alert
            type="info"
            showIcon
            title={tripMessages.minePendingAlert}
            action={
              <Button
                size="small"
                onClick={() => {
                  window.location.hash = `#/trips/${targetTripId}/applications`;
                }}
              >
                {tripMessages.minePendingAction}
              </Button>
            }
          />
        )}

        {error !== null && data !== null && (
          <Alert type="error" showIcon title={tripMessages.failedTitle} description={error} />
        )}

        <Segmented
          className="mine-seg"
          aria-label={tripMessages.mineGroupLabel}
          value={tab}
          onChange={(value) => setTab(value as MineTab)}
          options={tabs.map((item) => ({
            value: item.value,
            label: (
              <span className="mine-tab-label">
                {item.label}
                <span className="seg-count">{counts?.[item.value] ?? 0}</span>
              </span>
            ),
          }))}
        />

        {data === null && <Skeleton active paragraph={{ rows: 4 }} />}
        {data !== null && renderRows()}
      </div>

      <TripCancelModal
        open={cancelTarget !== null}
        userId={currentUser.id}
        trip={cancelTarget ?? { id: 0, title: '' }}
        onClose={() => setCancelTarget(null)}
        onCancelled={() => {
          setCancelTarget(null);
          void reload(true);
        }}
      />

      <Modal
        open={confirmAction !== null}
        title={tripMessages.detailCompleteTrip}
        okText={tripMessages.detailCompleteTrip}
        cancelText={tripMessages.createCancel}
        confirmLoading={busyKey !== null}
        onOk={() => void confirmNow()}
        onCancel={() => setConfirmAction(null)}
      >
        <Typography.Paragraph>{tripMessages.detailCompleteHint}</Typography.Paragraph>
        {confirmAction !== null && (
          <StopCompletionPicker
            stops={confirmAction.stops}
            checked={completeChecked}
            onChange={setCompleteChecked}
          />
        )}
      </Modal>

      <TripLeaveModal
        open={leaveTarget !== null}
        userId={currentUser.id}
        tripId={leaveTarget?.id ?? 0}
        title={leaveTarget?.title}
        onClose={() => setLeaveTarget(null)}
        onLeft={() => {
          setLeaveTarget(null);
          refreshCredit();
          void reload(true);
        }}
      />

      <TripRecordModal
        open={recordTarget !== null}
        userId={currentUser.id}
        tripId={recordTarget?.trip.id ?? 0}
        title={recordTarget?.trip.title}
        history={recordTarget?.history ?? []}
        onClose={() => setRecordTarget(null)}
      />
    </main>
  );
}