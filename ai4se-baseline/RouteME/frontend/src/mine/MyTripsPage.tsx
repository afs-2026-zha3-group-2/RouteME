import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Skeleton, Tabs, Typography } from 'antd';
import { loadMyExperiences, loadMyTrips } from '../api';
import { mineMeetingNote } from '../chat/chatMeeting';
import { tripMessages } from '../i18n/tripMessages';
import { publisherSummary } from '../profile/profileDisplay';
import { Avatar } from '../shell/Avatar';
import { applicationLabel } from '../trips/applicationStatus';
import { TripCard } from '../trips/TripCard';
import type { DemoUser, Experience, MyTrips } from '../types';

type Props = {
  currentUser: DemoUser;
  isAuthenticated: boolean;
};

function EmptyGroup() {
  return <Typography.Text type="secondary">{tripMessages.mineEmpty}</Typography.Text>;
}

export function MyTripsPage({ currentUser, isAuthenticated }: Props) {
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
      <div className="page-stack">
        <Typography.Title level={2} className="trip-heading">
          {tripMessages.mineTitle}
        </Typography.Title>

        <section className="mine-profile-card" aria-label="我的资料">
          <Avatar user={currentUser} size="lg" />
          <div className="mine-profile-text">
            <b>{currentUser.nickname}</b>
            <span>{publisherSummary(currentUser) || tripMessages.mineProfileIncomplete}</span>
          </div>
          {isAuthenticated && (
            <div className="mine-profile-actions">
              {currentUser.profile_complete ? (
                <>
                  <a className="btn sm ghost" href={`#/users/${currentUser.id}`}>
                    {tripMessages.profileViewEntry}
                  </a>
                  <a className="btn sm ghost" href="#/profile/setup">
                    {tripMessages.profileEditEntry}
                  </a>
                </>
              ) : (
                <a className="btn sm primary" href="#/profile/setup">
                  {tripMessages.profileCompleteEntry}
                </a>
              )}
            </div>
          )}
        </section>

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
            className="mine-tabs"
            items={[
              {
                key: 'published',
                label: `${tripMessages.minePublished}（${data.published.length}）`,
                children:
                  data.published.length === 0 ? (
                    <EmptyGroup />
                  ) : (
                    <div className="mine-list">
                      {data.published.map((trip) => (
                        <div key={trip.id} className="mine-row">
                          <TripCard trip={trip} compact />
                        </div>
                      ))}
                    </div>
                  ),
              },
              {
                key: 'applied',
                label: `${tripMessages.mineApplied}（${data.applied.length}）`,
                children:
                  data.applied.length === 0 ? (
                    <EmptyGroup />
                  ) : (
                    <div className="mine-list">
                      {data.applied.map((application) => (
                        <a
                          key={application.id}
                          className="mine-row mine-row-link"
                          href={`#/trips/${application.trip.id}`}
                        >
                          <span className="mine-row-main">
                            <span className="mine-row-title">{application.trip.title}</span>
                            <span className="mine-row-meta">
                              {application.trip.destination} · {application.trip.start_date} →{' '}
                              {application.trip.end_date}
                            </span>
                          </span>
                          <span className="mine-row-actions">
                            <span className="badge muted">{applicationLabel(application.status)}</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  ),
              },
              {
                key: 'matched',
                label: `${tripMessages.mineMatched}（${data.matched.length}）`,
                children:
                  data.matched.length === 0 ? (
                    <EmptyGroup />
                  ) : (
                    <div className="mine-list">
                      {data.matched.map((trip) => (
                        <div key={trip.id} className="mine-row">
                          <TripCard trip={trip} compact />
                          <p className="mine-meeting-note mine-row-meta">
                            {mineMeetingNote(trip.meeting_area, trip.meeting_time, trip.joined_count)}
                          </p>
                          <div className="mine-row-actions">
                            <Button
                              size="small"
                              onClick={() =>
                                (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)
                              }
                            >
                              {tripMessages.mineChatEntry}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
              },
              {
                key: 'completed',
                label: `${tripMessages.mineCompleted}（${data.completed.length}）`,
                children:
                  data.completed.length === 0 ? (
                    <EmptyGroup />
                  ) : (
                    <div className="mine-list">
                      {data.completed.map((trip) => {
                        const shared = experiences.some(
                          (experience) => experience.trip.id === trip.id,
                        );
                        return (
                          <div key={trip.id} className="mine-row">
                            <TripCard trip={trip} compact />
                            <div className="mine-row-actions">
                              <span className={shared ? 'badge jade' : 'badge muted'}>
                                {shared
                                  ? tripMessages.experienceEditEntry
                                  : tripMessages.experienceShareEntry}
                              </span>
                              <Button
                                size="small"
                                onClick={() => (window.location.hash = `#/share/${trip.id}`)}
                              >
                                {shared
                                  ? tripMessages.experienceEditEntry
                                  : tripMessages.experienceShareEntry}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ),
              },
            ]}
          />
        )}
      </div>
    </main>
  );
}