import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  applyForTrip,
  cancelApplication,
  completeTrip,
  leaveTrip,
  loadMatch,
  loadMyApplications,
  loadTripApplications,
  loadTripExperiences,
} from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { intensityLabel } from '../experiences/experienceForm';
import { publisherSummary } from '../profile/profileDisplay';
import { ReportModal } from '../safety/ReportModal';
import { SafetyNote } from '../safety/SafetyNote';
import { Avatar } from '../shell/Avatar';
import type { DemoUser, Experience, MatchCandidate, TripApplication } from '../types';
import { statusColor, statusLabel } from './tripStatus';
import { useTrip } from './useTrip';

const MAX_MESSAGE_LENGTH = 120;

type Props = {
  currentUser: DemoUser;
  tripId: number;
};

function applicationLabel(status: TripApplication['status']): string {
  if (status === 'pending') {
    return tripMessages.applyStatusPending;
  }
  if (status === 'accepted') {
    return tripMessages.applyStatusAccepted;
  }
  if (status === 'rejected') {
    return tripMessages.applyStatusRejected;
  }
  return tripMessages.applyStatusCancelled;
}

export function TripDetailPage({ currentUser, tripId }: Props) {
  const { state, reload } = useTrip(currentUser.id, tripId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [myApplication, setMyApplication] = useState<TripApplication | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [match, setMatch] = useState<MatchCandidate | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    'complete' | 'cancelApply' | 'leave' | null
  >(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [experiences, setExperiences] = useState<Experience[] | null>(null);

  useEffect(() => {
    let active = true;
    loadMyApplications(currentUser.id)
      .then((applications) => {
        if (active) {
          const latest = applications
            .filter((application) => application.trip_id === tripId)
            .sort((left, right) => right.id - left.id)[0];
          setMyApplication(latest ?? null);
        }
      })
      .catch(() => undefined);
    loadMatch(currentUser.id, tripId)
      .then((loaded) => {
        if (active) {
          setMatch(loaded);
        }
      })
      .catch(() => undefined);
    loadTripExperiences(currentUser.id, tripId)
      .then((loaded) => {
        if (active) {
          setExperiences(loaded);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser.id, tripId]);

  useEffect(() => {
    const isPublisher = state.status === 'ready' && state.trip.publisher.id === currentUser.id;
    if (!isPublisher) {
      return;
    }
    loadTripApplications(currentUser.id, tripId)
      .then((applications) => {
        setPendingCount(applications.filter((application) => application.status === 'pending').length);
      })
      .catch(() => undefined);
  }, [currentUser.id, tripId, state]);

  const complete = async () => {
    setCompleting(true);
    setActionError(null);
    try {
      await completeTrip(currentUser.id, tripId);
      reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    } finally {
      setCompleting(false);
    }
  };

  const submitApplication = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const created = await applyForTrip(
        currentUser.id,
        tripId,
        applyMessage.trim() === '' ? null : applyMessage.trim(),
      );
      setMyApplication(created);
      setApplyOpen(false);
      setApplyMessage('');
      reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelMyApplication = async () => {
    if (myApplication === null) {
      return;
    }
    setCancelling(true);
    setActionError(null);
    try {
      const cancelled = await cancelApplication(currentUser.id, myApplication.id);
      setMyApplication(cancelled);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    } finally {
      setCancelling(false);
    }
  };

  const leave = async () => {
    setLeaving(true);
    setActionError(null);
    try {
      await leaveTrip(currentUser.id, tripId);
      setMyApplication(null);
      reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    } finally {
      setLeaving(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <main className="form-page">
        <Card className="form-card">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </main>
    );
  }

  if (state.status === 'failed') {
    return (
      <main className="form-page">
        <Alert
          type="error"
          showIcon
          title={state.code === 'TRIP_NOT_FOUND' ? tripMessages.detailNotFound : tripMessages.failedTitle}
          description={state.code}
          action={
            <Button onClick={() => (window.location.hash = '#/')}>{tripMessages.backHome}</Button>
          }
        />
      </main>
    );
  }

  const { trip } = state;
  const isPublisher = trip.publisher.id === currentUser.id;
  const isCompleted = trip.status === 'completed';
  const isFull = trip.status === 'full';
  const hasActiveApplication =
    myApplication !== null &&
    (myApplication.status === 'pending' || myApplication.status === 'accepted');
  const canApply = !isPublisher && !isCompleted && !isFull && !hasActiveApplication;
  const participant = trip.participants.some((member) => member.id === currentUser.id);
  const canShare = isCompleted && participant;
  const hasShared = experiences?.some((experience) => experience.author.id === currentUser.id) ?? false;
  const budget =
    trip.budget_min_cents === null
      ? null
      : `${trip.budget_min_cents / 100}${trip.budget_max_cents === null ? '' : ` – ${trip.budget_max_cents / 100}`} 元`;

  const confirmTitle =
    confirmAction === 'complete'
      ? tripMessages.detailMarkCompleted
      : confirmAction === 'cancelApply'
        ? tripMessages.applyCancelConfirm
        : tripMessages.leaveConfirm;
  const confirmOkText =
    confirmAction === 'complete'
      ? tripMessages.detailMarkCompleted
      : confirmAction === 'cancelApply'
        ? tripMessages.applyCancel
        : tripMessages.leaveTrip;
  const confirmBusy =
    confirmAction === 'complete' ? completing : confirmAction === 'leave' ? leaving : cancelling;
  const confirmHint =
    confirmAction === 'complete'
      ? '结束后行程会从首页默认列表移除，也不再接受新的同行申请。'
      : confirmAction === 'cancelApply'
        ? '取消后可以再次申请，但需要发布者重新处理。'
        : '退出后这条行程的聊天会关闭。';

  const runConfirm = async () => {
    if (confirmAction === 'complete') {
      await complete();
    } else if (confirmAction === 'cancelApply') {
      await cancelMyApplication();
    } else if (confirmAction === 'leave') {
      await leave();
    }
    setConfirmAction(null);
  };

  return (
    <main className="form-page">
      <div className="detail-stack">
        <a href="#/" className="detail-back">
          {tripMessages.backHome}
        </a>

        <Card className="panel detail-card">
          <header className="detail-head">
            <div className="detail-badges">
              <Tag color={statusColor(trip.status)}>{statusLabel(trip.status)}</Tag>
              <Tag>{trip.destination}</Tag>
            </div>
            <Typography.Title level={2} className="trip-title detail-title">
              {trip.title}
            </Typography.Title>
            <p className="detail-meta">
              <span>{trip.start_date} → {trip.end_date}</span>
              <span>
                {tripMessages.joinedLabel} {trip.joined_count}/{trip.capacity}
                {tripMessages.peopleUnit}
              </span>
            </p>
          </header>

          <section className="detail-section">
            <h3 className="section-title">{tripMessages.detailStops}</h3>
            <ol className="detail-stops">
              {trip.stops.map((stop) => (
                <li key={stop}>{stop}</li>
              ))}
            </ol>
            <dl className="detail-facts">
              {trip.meeting_area !== null && (
                <div>
                  <dt>{tripMessages.detailMeetingArea}</dt>
                  <dd>{trip.meeting_area}</dd>
                </div>
              )}
              {budget !== null && (
                <div>
                  <dt>{tripMessages.detailBudget}</dt>
                  <dd>{budget}</dd>
                </div>
              )}
              {trip.note !== null && (
                <div>
                  <dt>{tripMessages.detailNote}</dt>
                  <dd>{trip.note}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="detail-section">
            <h3 className="section-title">{tripMessages.detailPublisher}</h3>
            <a
              className="publisher-row"
              href={`#/users/${trip.publisher.id}`}
              aria-label={`查看 ${trip.publisher.nickname} 的个人主页`}
            >
              <Avatar user={trip.publisher} size="lg" />
              <div className="publisher-body">
                <p className="publisher-name">
                  {trip.publisher.nickname}
                  {publisherSummary(trip.publisher) !== '' && ` · ${publisherSummary(trip.publisher)}`}
                </p>
                {trip.publisher.bio !== '' && (
                  <p className="publisher-bio">{trip.publisher.bio}</p>
                )}
                {trip.publisher.interests.length > 0 && (
                  <div className="publisher-tags">
                    {trip.publisher.interests.map((interest) => (
                      <span key={interest} className="tag">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </a>
          </section>

          <section className="detail-section">
            <h3 className="section-title">{tripMessages.detailParticipants}</h3>
            <ul className="detail-participants">
              {trip.participants.map((member) => (
                <li key={member.id}>{member.nickname}</li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h3 className="section-title">{tripMessages.experienceSectionTitle}</h3>
            {experiences !== null && experiences.length === 0 && (
              <Typography.Text type="secondary">{tripMessages.experienceSectionEmpty}</Typography.Text>
            )}
            {experiences !== null && experiences.length > 0 && (
              <ul className="experience-list">
                {experiences.map((experience) => (
                  <li key={experience.id}>
                    <div className="experience-list-head">
                      <Tag>{experience.author.avatar_initial}</Tag>
                      <strong>{experience.author.nickname}</strong>
                      <span className="badge amber">
                        {tripMessages.experienceIntensityLabel} · {intensityLabel(experience.intensity)}
                      </span>
                    </div>
                    <p className="experience-full">{experience.content}</p>
                    <p className="experience-advice-line">
                      <b>{tripMessages.experienceAdviceLabel}：</b>
                      {experience.advice}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {(canShare || isCompleted) && (
              <div className="detail-actions">
                {canShare && (
                  <Button onClick={() => (window.location.hash = `#/share/${trip.id}`)}>
                    {hasShared ? tripMessages.experienceEditEntry : tripMessages.experienceShareEntry}
                  </Button>
                )}
                {isCompleted && (
                  <Button onClick={() => (window.location.hash = `#/trips/new?from=${trip.id}`)}>
                    {tripMessages.referencePublish}
                  </Button>
                )}
              </div>
            )}
          </section>

          {match !== null && (
            <section className="detail-section">
              <h3 className="section-title">{tripMessages.matchPanelTitle}</h3>
              <ul className="match-reason-list">
                {match.match.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="detail-meta">
                {tripMessages.matchPercentage} {match.match.percentage}% · {match.match.basis}
              </p>
            </section>
          )}

          {actionError !== null && (
            <Alert type="error" showIcon title={tripMessages.applyFailed} description={actionError} />
          )}

          <SafetyNote onReport={() => setReportOpen(true)} />

          {myApplication !== null && (
            <section className="detail-section detail-section-plain">
              <div className="application-status">
                <Tag color={myApplication.status === 'accepted' ? 'green' : 'default'}>
                  {applicationLabel(myApplication.status)}
                </Tag>
                {myApplication.message !== null && (
                  <Typography.Text type="secondary">{myApplication.message}</Typography.Text>
                )}
              </div>
              <div className="detail-actions">
                {myApplication.status === 'pending' && (
                  <Button size="small" loading={cancelling} onClick={() => setConfirmAction('cancelApply')}>
                    {tripMessages.applyCancel}
                  </Button>
                )}
                {myApplication.status === 'accepted' && (
                  <Button
                    size="small"
                    onClick={() => (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)}
                  >
                    {tripMessages.chatEntry}
                  </Button>
                )}
                {myApplication.status === 'accepted' && (
                  <Button size="small" danger loading={leaving} onClick={() => setConfirmAction('leave')}>
                    {tripMessages.leaveTrip}
                  </Button>
                )}
              </div>
            </section>
          )}

          <div className="detail-actions detail-actions-primary">
            {canApply && (
              <Button type="primary" onClick={() => setApplyOpen(true)}>
                {tripMessages.applyEntry}
              </Button>
            )}
            {isPublisher && !isCompleted && (
              <Button loading={completing} onClick={() => setConfirmAction('complete')}>
                {tripMessages.detailMarkCompleted}
              </Button>
            )}
            {isPublisher && (
              <Button onClick={() => (window.location.hash = `#/trips/${trip.id}/applications`)}>
                {tripMessages.applicationsEntry}
                {pendingCount > 0 ? `（${pendingCount}）` : ''}
              </Button>
            )}
            {isPublisher && <span className="badge dusk">{tripMessages.applyEntryOwn}</span>}
            {!canApply && !isPublisher && !hasActiveApplication && (
              <span className="badge muted">
                {isCompleted ? tripMessages.detailCompleted : tripMessages.applyEntryDisabled}
              </span>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={confirmAction !== null}
        title={confirmTitle}
        okText={confirmOkText}
        cancelText={tripMessages.createCancel}
        confirmLoading={confirmBusy}
        okButtonProps={{ danger: confirmAction !== 'complete' }}
        onOk={runConfirm}
        onCancel={() => setConfirmAction(null)}
      >
        <Typography.Paragraph>{confirmHint}</Typography.Paragraph>
      </Modal>

      <Modal
        open={applyOpen}
        title={tripMessages.applyDialogTitle}
        okText={tripMessages.applySubmit}
        cancelText={tripMessages.createCancel}
        confirmLoading={submitting}
        onOk={submitApplication}
        onCancel={() => setApplyOpen(false)}
      >
        <Space orientation="vertical" size="small" className="home-stack">
          <Typography.Text>{tripMessages.applyMessageLabel}</Typography.Text>
          <Input.TextArea
            value={applyMessage}
            maxLength={MAX_MESSAGE_LENGTH}
            showCount
            rows={3}
            placeholder={tripMessages.applyMessagePlaceholder}
            onChange={(event) => setApplyMessage(event.target.value)}
          />
        </Space>
      </Modal>
      <ReportModal
        userId={currentUser.id}
        open={reportOpen}
        targetType="trip"
        targetId={tripId}
        onClose={() => setReportOpen(false)}
      />
    </main>
  );
}