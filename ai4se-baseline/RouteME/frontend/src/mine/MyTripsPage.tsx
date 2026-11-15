import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { loadMyExperiences, loadMyTrips } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser, Experience, MyTrips, TripApplication, TripSummary } from '../types';
import { statusColor, statusLabel } from '../trips/tripStatus';

type Props = {
  currentUser: DemoUser;
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

function TripCard({ trip }: { trip: TripSummary }) {
  return (
    <a className="trip-card-link" href={`#/trips/${trip.id}`}>
      <Card hoverable size="small">
        <Space orientation="vertical" size={4} className="home-stack">
          <Space size="small" wrap>
            <Tag color={statusColor(trip.status)}>{statusLabel(trip.status)}</Tag>
            <Tag>{trip.destination}</Tag>
          </Space>
          <Typography.Text strong>{trip.title}</Typography.Text>
          <Typography.Text type="secondary">
            {trip.start_date} → {trip.end_date} · {tripMessages.joinedLabel} {trip.joined_count}/
            {trip.capacity}
            {tripMessages.peopleUnit}
          </Typography.Text>
        </Space>
      </Card>
    </a>
  );
}

export function MyTripsPage({ currentUser }: Props) {
  const [data, setData] = useState<MyTrips | null>(null);
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(() => {
      setError(null);
      Promise.all([loadMyTrips(currentUser.id), loadMyExperiences(currentUser.id)])
        .then(([loaded, loadedExperiences]) => {
          setData(loaded);
          setExperiences(loadedExperiences);
        })
        .catch((caught: unknown) => {
          setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
        });
    }, [currentUser.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (error !== null && data === null) {
    return (
      <main className="trip-page">
        <Alert
          type="error"
          showIcon
          title={tripMessages.failedTitle}
          description={error}
          action={<Button onClick={reload}>{tripMessages.retry}</Button>}
        />
      </main>
    );
  }

  return (
    <main className="trip-page">
      <Space orientation="vertical" size="large" className="trip-stack">
        <Typography.Title level={2} className="trip-heading">
          {tripMessages.mineTitle}
        </Typography.Title>

        {data === null && <Skeleton active paragraph={{ rows: 4 }} />}

        {data !== null && data.pending_application_count > 0 && (
          <Alert
            type="info"
            showIcon
            title={`${tripMessages.minePendingAlert}（${data.pending_application_count}）`}
            action={
              data.published.length > 0 ? (
                <Button
                  size="small"
                  onClick={() =>
                    (window.location.hash = `#/trips/${data.published[0].id}/applications`)
                  }
                >
                  {tripMessages.minePendingAction}
                </Button>
              ) : undefined
            }
          />
        )}

        {data !== null && (
          <Tabs
            items={[
              {
                key: 'published',
                label: `${tripMessages.minePublished}（${data.published.length}）`,
                children:
                  data.published.length === 0 ? (
                    <Typography.Text type="secondary">{tripMessages.mineEmpty}</Typography.Text>
                  ) : (
                    <Space orientation="vertical" size="small" className="trip-stack">
                      {data.published.map((trip) => (
                        <TripCard key={trip.id} trip={trip} />
                      ))}
                    </Space>
                  ),
              },
              {
                key: 'applied',
                label: `${tripMessages.mineApplied}（${data.applied.length}）`,
                children:
                  data.applied.length === 0 ? (
                    <Typography.Text type="secondary">{tripMessages.mineEmpty}</Typography.Text>
                  ) : (
                    <Space orientation="vertical" size="small" className="trip-stack">
                      {data.applied.map((application) => (
                        <a
                          key={application.id}
                          className="trip-card-link"
                          href={`#/trips/${application.trip.id}`}
                        >
                          <Card hoverable size="small">
                            <Space size="small" wrap>
                              <Tag>{applicationLabel(application.status)}</Tag>
                              <Typography.Text strong>{application.trip.title}</Typography.Text>
                              <Typography.Text type="secondary">
                                {application.trip.start_date} → {application.trip.end_date}
                              </Typography.Text>
                            </Space>
                          </Card>
                        </a>
                      ))}
                    </Space>
                  ),
              },
              {
                key: 'matched',
                label: `${tripMessages.mineMatched}（${data.matched.length}）`,
                children:
                  data.matched.length === 0 ? (
                    <Typography.Text type="secondary">{tripMessages.mineEmpty}</Typography.Text>
                  ) : (
                    <Space orientation="vertical" size="small" className="trip-stack">
                      {data.matched.map((trip) => (
                        <Space key={trip.id} size="small" wrap>
                          <TripCard trip={trip} />
                          <Button
                            size="small"
                            onClick={() =>
                              (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)
                            }
                          >
                            {tripMessages.mineChatEntry}
                          </Button>
                        </Space>
                      ))}
                    </Space>
                  ),
              },
              {
                key: 'completed',
                label: `${tripMessages.mineCompleted}（${data.completed.length}）`,
                children:
                  data.completed.length === 0 ? (
                    <Typography.Text type="secondary">{tripMessages.mineEmpty}</Typography.Text>
                  ) : (
                    <Space orientation="vertical" size="small" className="trip-stack">
                                          {data.completed.map((trip) => {
                                            const shared = experiences.some(
                                              (experience) => experience.trip.id === trip.id,
                                            );
                                            return (
                                              <Space key={trip.id} size="small" wrap>
                                                <TripCard trip={trip} />
                                                <Tag color={shared ? 'green' : 'default'}>
                                                  {shared
                                                    ? tripMessages.experienceEditEntry
                                                    : tripMessages.experienceShareEntry}
                                                </Tag>
                                                <Button
                                                  size="small"
                                                  onClick={() => (window.location.hash = `#/share/${trip.id}`)}
                                                >
                                                  {shared
                                                    ? tripMessages.experienceEditEntry
                                                    : tripMessages.experienceShareEntry}
                                                </Button>
                                              </Space>
                                            );
                                          })}
                                        </Space>
                  ),
              },
            ]}
          />
        )}
      </Space>
    </main>
  );
}