import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  applyForTrip,
  cancelApplication,
  completeTrip,
  loadMatch,
  loadMyApplications,
  loadTripApplications,
} from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser, MatchCandidate, TripApplication } from '../types';
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
    setActionError(null);
    try {
      const cancelled = await cancelApplication(currentUser.id, myApplication.id);
      setMyApplication(cancelled);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
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
  const budget =
    trip.budget_min_cents === null
      ? null
      : `${trip.budget_min_cents / 100}${trip.budget_max_cents === null ? '' : ` – ${trip.budget_max_cents / 100}`} 元`;

  return (
    <main className="form-page">
      <Space orientation="vertical" size="middle" className="detail-stack">
        <a href="#/" className="detail-back">
          {tripMessages.backHome}
        </a>
        <Card>
          <Space orientation="vertical" size="small" className="home-stack">
            <Space size="small" wrap>
              <Tag color={statusColor(trip.status)}>{statusLabel(trip.status)}</Tag>
              <Tag>{trip.destination}</Tag>
            </Space>
            <Typography.Title level={2} className="trip-title">
              {trip.title}
            </Typography.Title>
            <Typography.Text type="secondary">
              {trip.start_date} → {trip.end_date}
            </Typography.Text>
            <Typography.Text>
              {tripMessages.joinedLabel} {trip.joined_count}/{trip.capacity}
              {tripMessages.peopleUnit}
            </Typography.Text>

            <Descriptions column={1} size="small" className="detail-descriptions">
              <Descriptions.Item label={tripMessages.detailStops}>
                <ol className="detail-stops">
                  {trip.stops.map((stop) => (
                    <li key={stop}>{stop}</li>
                  ))}
                </ol>
              </Descriptions.Item>
              {trip.meeting_area !== null && (
                <Descriptions.Item label={tripMessages.detailMeetingArea}>{trip.meeting_area}</Descriptions.Item>
              )}
              {budget !== null && (
                <Descriptions.Item label={tripMessages.detailBudget}>{budget}</Descriptions.Item>
              )}
              {trip.note !== null && (
                <Descriptions.Item label={tripMessages.detailNote}>{trip.note}</Descriptions.Item>
              )}
            </Descriptions>

            <Typography.Title level={5} className="trip-title">
              {tripMessages.detailPublisher}
            </Typography.Title>
            <Space align="start">
              <Tag>{trip.publisher.avatar_initial}</Tag>
              <Space orientation="vertical" size={0}>
                <Typography.Text strong>
                  {trip.publisher.nickname} · {trip.publisher.school}
                </Typography.Text>
                <Typography.Text type="secondary">{trip.publisher.bio}</Typography.Text>
                <Space size={[4, 4]} wrap>
                  {trip.publisher.interests.map((interest) => (
                    <Tag key={interest}>{interest}</Tag>
                  ))}
                </Space>
              </Space>
            </Space>

            <Typography.Title level={5} className="trip-title">
              {tripMessages.detailParticipants}
            </Typography.Title>
            <ul className="detail-participants">
              {trip.participants.map((participant) => (
                <li key={participant.id}>{participant.nickname}</li>
              ))}
            </ul>

            {match !== null && (
              <div className="match-reasons">
                <Typography.Title level={5} className="trip-title">
                  {tripMessages.matchPanelTitle}
                </Typography.Title>
                <ul className="match-reason-list">
                  {match.match.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <Typography.Text type="secondary">
                  {tripMessages.matchPercentage} {match.match.percentage}% · {match.match.basis}
                </Typography.Text>
              </div>
            )}

            {actionError !== null && (
              <Alert type="error" showIcon title={tripMessages.applyFailed} description={actionError} />
            )}

            {myApplication !== null && (
              <Space size="small" wrap>
                <Tag color={myApplication.status === 'accepted' ? 'green' : 'default'}>
                  {applicationLabel(myApplication.status)}
                </Tag>
                {myApplication.message !== null && (
                  <Typography.Text type="secondary">{myApplication.message}</Typography.Text>
                )}
                {myApplication.status === 'pending' && (
                  <Popconfirm
                    title={tripMessages.applyCancelConfirm}
                    onConfirm={cancelMyApplication}
                    okText={tripMessages.applyCancel}
                    cancelText={tripMessages.createCancel}
                  >
                    <Button size="small">{tripMessages.applyCancel}</Button>
                  </Popconfirm>
                )}
                {myApplication.status === 'accepted' && (
                  <Button
                    size="small"
                    onClick={() => (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)}
                  >
                    {tripMessages.chatEntry}
                  </Button>
                )}
              </Space>
            )}

            <Space wrap>
              {canApply && (
                <Button type="primary" onClick={() => setApplyOpen(true)}>
                  {tripMessages.applyEntry}
                </Button>
              )}
              {isPublisher && !isCompleted && (
                <Popconfirm
                  title={tripMessages.detailMarkCompleted}
                  onConfirm={complete}
                  okText={tripMessages.detailMarkCompleted}
                  cancelText={tripMessages.createCancel}
                >
                  <Button loading={completing}>{tripMessages.detailMarkCompleted}</Button>
                </Popconfirm>
              )}
              {isPublisher && (
                <Button onClick={() => (window.location.hash = `#/trips/${trip.id}/applications`)}>
                  {tripMessages.applicationsEntry}
                  {pendingCount > 0 ? `（${pendingCount}）` : ''}
                </Button>
              )}
              {isPublisher && <Tag>{tripMessages.applyEntryOwn}</Tag>}
              {!canApply && !isPublisher && !hasActiveApplication && (
                <Tag>{isCompleted ? tripMessages.detailCompleted : tripMessages.applyEntryDisabled}</Tag>
              )}
            </Space>

            {isCompleted && <Alert type="info" showIcon title={tripMessages.experiencePlaceholder} />}
          </Space>
        </Card>
      </Space>

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
    </main>
  );
}