import { useState } from 'react';
import {
  Alert,
    Button,
    Card,
    Descriptions,
    Popconfirm,
    Skeleton,
    Space,
    Tag,
    Typography,
    message,
  } from 'antd';
import { completeTrip } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser } from '../types';
import { statusColor, statusLabel } from './tripStatus';
import { useTrip } from './useTrip';

type Props = {
  currentUser: DemoUser;
  tripId: number;
};

export function TripDetailPage({ currentUser, tripId }: Props) {
  const { state, reload } = useTrip(currentUser.id, tripId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

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
          message={state.code === 'TRIP_NOT_FOUND' ? tripMessages.detailNotFound : tripMessages.failedTitle}
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
  const canApply = !isPublisher && !isCompleted && !isFull;
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
            {trip.joined_count > trip.participants.length && (
              <Typography.Text type="secondary">{tripMessages.detailParticipantsPending}</Typography.Text>
            )}

            {actionError !== null && (
              <Alert type="error" showIcon title={tripMessages.detailCompleteFailed} description={actionError} />
            )}

            <Space wrap>
              {canApply && (
                <>
                  <Button type="primary" onClick={() => message.info(tripMessages.applyEntryHint)}>
                    {tripMessages.applyEntry}
                  </Button>
                  <Typography.Text type="secondary">{tripMessages.applyEntryHint}</Typography.Text>
                </>
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
              {isPublisher && <Tag>{tripMessages.applyEntryOwn}</Tag>}
              {!canApply && !isPublisher && (
                <Tag>{isCompleted ? tripMessages.detailCompleted : tripMessages.applyEntryDisabled}</Tag>
              )}
            </Space>

            {isCompleted && (
              <Alert type="info" showIcon title={tripMessages.experiencePlaceholder} />
            )}
          </Space>
        </Card>
      </Space>
    </main>
  );
}