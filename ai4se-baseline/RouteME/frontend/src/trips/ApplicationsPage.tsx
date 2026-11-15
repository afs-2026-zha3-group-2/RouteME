import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Skeleton, Space, Tag, Typography } from 'antd';
import { acceptApplication, loadTrip, loadTripApplications, rejectApplication } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser, TripApplication, TripDetail } from '../types';
import { statusColor, statusLabel } from '../trips/tripStatus';

type Props = {
  currentUser: DemoUser;
  tripId: number;
};

export function ApplicationsPage({ currentUser, tripId }: Props) {
  const [applications, setApplications] = useState<TripApplication[] | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setError(null);
    Promise.all([loadTripApplications(currentUser.id, tripId), loadTrip(currentUser.id, tripId)])
      .then(([loadedApplications, loadedTrip]) => {
        setApplications(loadedApplications);
        setTrip(loadedTrip);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [currentUser.id, tripId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const decide = async (application: TripApplication, accept: boolean) => {
    setBusyId(application.id);
    setError(null);
    try {
      if (accept) {
        await acceptApplication(currentUser.id, application.id);
      } else {
        await rejectApplication(currentUser.id, application.id);
      }
      reload();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
    } finally {
      setBusyId(null);
    }
  };

  if (error !== null && applications === null) {
    return (
      <main className="form-page">
        <Alert
          type="error"
          showIcon
          title={tripMessages.applicationsUnavailable}
          description={error}
          action={
            <Button onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
              {tripMessages.backHome}
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className="form-page">
      <Space orientation="vertical" size="middle" className="detail-stack">
        <a href={`#/trips/${tripId}`} className="detail-back">
          {tripMessages.detailTitle}
        </a>
        <Card className="panel">
          <Space orientation="vertical" size="small" className="home-stack">
            <Typography.Title level={2} className="trip-title">
              {tripMessages.applicationsTitle}
            </Typography.Title>
            {trip !== null && (
              <Space size="small" wrap>
                <Typography.Text strong>{trip.title}</Typography.Text>
                <Tag color={statusColor(trip.status)}>{statusLabel(trip.status)}</Tag>
                <Typography.Text type="secondary">
                  {tripMessages.joinedLabel} {trip.joined_count}/{trip.capacity}
                  {tripMessages.peopleUnit}
                </Typography.Text>
              </Space>
            )}

            {error !== null && (
              <Alert type="error" showIcon title={tripMessages.applicationsFailed} description={error} />
            )}

            {applications === null && <Skeleton active paragraph={{ rows: 4 }} />}

            {applications !== null && applications.length === 0 && (
              <Typography.Text type="secondary">{tripMessages.applicationsEmpty}</Typography.Text>
            )}

            {applications !== null && applications.length > 0 && (
              <ul className="application-list">
                {applications.map((application) => (
                  <li key={application.id}>
                    <Space orientation="vertical" size={4} className="home-stack">
                      <Space size="small" wrap>
                        <Tag>{application.applicant.avatar_initial}</Tag>
                        <Typography.Text strong>
                          {application.applicant.nickname} · {application.applicant.school}
                        </Typography.Text>
                        <Tag>{applicationLabel(application.status)}</Tag>
                      </Space>
                      <Typography.Text className="application-message">
                        {application.message ?? tripMessages.applicationsNoMessage}
                      </Typography.Text>
                      {application.status === 'pending' && (
                        <Space size="small">
                          <Button
                            type="primary"
                            size="small"
                            loading={busyId === application.id}
                            onClick={() => decide(application, true)}
                          >
                            {tripMessages.applicationsAccept}
                          </Button>
                          <Button
                            size="small"
                            loading={busyId === application.id}
                            onClick={() => decide(application, false)}
                          >
                            {tripMessages.applicationsReject}
                          </Button>
                        </Space>
                      )}
                    </Space>
                  </li>
                ))}
              </ul>
            )}
          </Space>
        </Card>
      </Space>
    </main>
  );
}

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