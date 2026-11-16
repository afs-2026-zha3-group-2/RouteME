import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Skeleton,
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
  loadTrip,
  loadTripApplications,
  loadTripExperiences,
} from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { intensityLabel } from '../experiences/experienceForm';
import { ReportModal } from '../safety/ReportModal';
import { SafetyNote } from '../safety/SafetyNote';
import type { DemoUser, Experience, MatchCandidate, TripApplication } from '../types';
import { applicationEntryState, applicationErrorMessage } from './applicationEntry';
import { statusColor, statusLabel } from './tripStatus';
import { useTrip } from './useTrip';

const MAX_MESSAGE_LENGTH = 120;

type Props = {
  currentUser: DemoUser;
  tripId: number;
};

type Feedback = {
  tone: 'error' | 'warning';
  title: string;
  detail?: string;
};

function pickLatestApplication(
  applications: TripApplication[],
  tripId: number,
): TripApplication | null {
  return (
    applications
      .filter((application) => application.trip_id === tripId)
      .sort((left, right) => right.id - left.id)[0] ?? null
  );
}

export function TripDetailPage({ currentUser, tripId }: Props) {
  const { state, reload } = useTrip(currentUser.id, tripId);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [completing, setCompleting] = useState(false);
  const [myApplication, setMyApplication] = useState<TripApplication | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [match, setMatch] = useState<MatchCandidate | null>(null);
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
          setMyApplication(pickLatestApplication(applications, tripId));
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

  const refreshMyApplication = async () => {
    const applications = await loadMyApplications(currentUser.id);
    setMyApplication(pickLatestApplication(applications, tripId));
  };

  const showActionError = (error: unknown) => {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    setFeedback({ tone: 'error', title: tripMessages.applyFailed, detail: code });
  };

  const complete = async () => {
    setCompleting(true);
    setFeedback(null);
    try {
      await completeTrip(currentUser.id, tripId);
      reload();
    } catch (error: unknown) {
      showActionError(error);
    } finally {
      setCompleting(false);
    }
  };

  const cancelMyApplication = async () => {
    if (myApplication === null) {
      return;
    }
    setCancelling(true);
    setFeedback(null);
    try {
      const cancelled = await cancelApplication(currentUser.id, myApplication.id);
      setMyApplication(cancelled);
    } catch (error: unknown) {
      showActionError(error);
    } finally {
      setCancelling(false);
    }
  };

  const leave = async () => {
    setLeaving(true);
    setFeedback(null);
    try {
      await leaveTrip(currentUser.id, tripId);
      setMyApplication(null);
      reload();
    } catch (error: unknown) {
      showActionError(error);
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
  const entry = applicationEntryState(trip, currentUser.id, myApplication);
  const isPublisher = entry.kind === 'publisher';
  const isCompleted = trip.status === 'completed';
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
        ? '撤回后可以再次申请，但需要发布者重新处理。'
        : '退出后这条行程的聊天会关闭。';

  const submitApplication = async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await applyForTrip(
        currentUser.id,
        tripId,
        applyMessage.trim() === '' ? null : applyMessage.trim(),
      );
      setMyApplication(created);
      setApplyMessage('');
      reload();
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      let currentStatus = trip.status;
      try {
        const freshTrip = await loadTrip(currentUser.id, tripId);
        currentStatus = freshTrip.status;
      } catch {
        // 刷新失败时保留旧状态，原因退化为「当前不可申请」。
      }
      const mapped = applicationErrorMessage(code, currentStatus);
      if (mapped === null) {
        showActionError(error);
      } else {
        setFeedback({
          tone: code === 'DUPLICATE_APPLICATION' ? 'warning' : 'error',
          title: mapped,
        });
      }
      await refreshMyApplication().catch(() => undefined);
      reload();
    } finally {
      setSubmitting(false);
    }
  };

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
            <div className="publisher-row">
              <Tag className="publisher-initial">{trip.publisher.avatar_initial}</Tag>
              <div className="publisher-body">
                <p className="publisher-name">
                  {trip.publisher.nickname} · {trip.publisher.school}
                </p>
                <p className="publisher-bio">{trip.publisher.bio}</p>
                <div className="publisher-tags">
                  {trip.publisher.interests.map((interest) => (
                    <span key={interest} className="tag">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
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

          {feedback !== null && (
            <Alert
              type={feedback.tone}
              showIcon
              title={feedback.title}
              description={feedback.detail}
            />
          )}

          <SafetyNote onReport={() => setReportOpen(true)} />

          {entry.kind !== 'publisher' && (
            <section className="detail-section detail-application">
              <h3 className="section-title">{tripMessages.applyAreaTitle}</h3>
              <div className="action-box">
                {entry.kind === 'pending' && (
                  <>
                    <p className="action-note warn">
                      {`申请已提交，等待 ${trip.publisher.nickname} 回应。处理前你可以随时撤回。`}
                    </p>
                    <Button
                      block
                      loading={cancelling}
                      onClick={() => setConfirmAction('cancelApply')}
                    >
                      {tripMessages.applyCancel}
                    </Button>
                  </>
                )}

                {entry.kind === 'accepted' && (
                  <>
                    <p className="action-note">{tripMessages.applyAcceptedNote}</p>
                    <Button
                      block
                      onClick={() => (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)}
                    >
                      {`与 ${trip.publisher.nickname} 沟通`}
                    </Button>
                    {!isCompleted && (
                      <Button block danger loading={leaving} onClick={() => setConfirmAction('leave')}>
                        {tripMessages.leaveTrip}
                      </Button>
                    )}
                  </>
                )}

                {entry.kind === 'unavailable' && <p className="action-note warn">{entry.reason}</p>}

                {entry.kind === 'apply' && (
                  <div className="apply-form">
                    <label className="field">
                      <span className="label">
                        {tripMessages.applyMessageLabel}
                        <span className="opt">{tripMessages.applyMessageOptional}</span>
                      </span>
                      <Input.TextArea
                        className="textarea"
                        value={applyMessage}
                        maxLength={MAX_MESSAGE_LENGTH}
                        rows={3}
                        placeholder={tripMessages.applyMessagePlaceholder}
                        onChange={(event) => setApplyMessage(event.target.value)}
                      />
                    </label>
                    <Button type="primary" block loading={submitting} onClick={submitApplication}>
                      {tripMessages.applySubmit}
                    </Button>
                    <p className="hint">{tripMessages.applyChatHint}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {isPublisher && (
            <div className="detail-actions detail-actions-primary">
              {!isCompleted && (
                <Button loading={completing} onClick={() => setConfirmAction('complete')}>
                  {tripMessages.detailMarkCompleted}
                </Button>
              )}
              <Button onClick={() => (window.location.hash = `#/trips/${trip.id}/applications`)}>
                {tripMessages.applicationsEntry}
                {pendingCount > 0 ? `（${pendingCount}）` : ''}
              </Button>
              <span className="badge dusk">{tripMessages.applyEntryOwn}</span>
            </div>
          )}
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