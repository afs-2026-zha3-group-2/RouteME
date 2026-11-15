import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Radio, Skeleton, Space, Typography, message } from 'antd';
import { loadTrip, loadTripExperiences, shareExperience } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { SafetyNote } from '../safety/SafetyNote';
import type { DemoUser, ExperienceIntensity, TripDetail } from '../types';
import {
  emptyExperienceDraft,
  hasExperienceErrors,
  INTENSITY_OPTIONS,
  MAX_ADVICE_LENGTH,
  MAX_CONTENT_LENGTH,
  toExperienceRequest,
  validateExperience,
  type ExperienceDraft,
  type ExperienceErrors,
} from '../experiences/experienceForm';

type Props = {
  currentUser: DemoUser;
  tripId: number;
};

export function ShareExperiencePage({ currentUser, tripId }: Props) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [draft, setDraft] = useState<ExperienceDraft>(emptyExperienceDraft);
  const [errors, setErrors] = useState<ExperienceErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadTrip(currentUser.id, tripId), loadTripExperiences(currentUser.id, tripId)])
      .then(([loadedTrip, experiences]) => {
        if (!active) {
          return;
        }
        setTrip(loadedTrip);
        const mine = experiences.find((experience) => experience.author.id === currentUser.id);
        if (mine !== undefined) {
          setEditing(true);
          setDraft({ content: mine.content, intensity: mine.intensity, advice: mine.advice });
        }
      })
      .catch((caught: unknown) => {
        setLoadError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
    return () => {
      active = false;
    };
  }, [currentUser.id, tripId]);

  const update = (patch: Partial<ExperienceDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  };

  const submit = async () => {
    const nextErrors = validateExperience(draft);
    setErrors(nextErrors);
    if (hasExperienceErrors(nextErrors)) {
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await shareExperience(currentUser.id, tripId, toExperienceRequest(draft));
      message.success(editing ? tripMessages.experienceUpdated : tripMessages.experienceSuccess);
      window.location.hash = `#/trips/${tripId}`;
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError !== null) {
    return (
      <main className="form-page">
        <Alert
          type="error"
          showIcon
          title={tripMessages.failedTitle}
          description={loadError}
          action={
            <Button onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
              {tripMessages.detailTitle}
            </Button>
          }
        />
      </main>
    );
  }

  if (trip === null) {
    return (
      <main className="form-page">
        <Card className="form-card">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </main>
    );
  }

  const participant = trip.participants.some((member) => member.id === currentUser.id);
  const canShare = trip.status === 'completed' && participant;

  if (!canShare) {
    return (
      <main className="form-page">
        <Alert
          type="warning"
          showIcon
          title={tripMessages.experienceNotAllowed}
          description={tripMessages.experienceSectionEmpty}
          action={
            <Button onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
              {tripMessages.detailTitle}
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
              {editing ? tripMessages.experienceEditEntry : tripMessages.experienceShareEntry}
            </Typography.Title>
            <Typography.Text type="secondary">
              {trip.title} · {trip.destination} · {trip.start_date} → {trip.end_date}
            </Typography.Text>

            <SafetyNote />
            <Alert type="info" showIcon title={tripMessages.experienceGoesTo} />

            <div className="experience-field">
              <Typography.Text strong>
                {tripMessages.experienceContentLabel}
                <span className="experience-counter">
                  {draft.content.length}/{MAX_CONTENT_LENGTH}
                </span>
              </Typography.Text>
              <Input.TextArea
                value={draft.content}
                rows={6}
                maxLength={MAX_CONTENT_LENGTH}
                placeholder={tripMessages.experienceContentPlaceholder}
                status={errors.content === undefined ? undefined : 'error'}
                onChange={(event) => update({ content: event.target.value })}
              />
              {errors.content !== undefined && (
                <Typography.Text type="danger">{errors.content}</Typography.Text>
              )}
            </div>

            <div className="experience-field">
              <Typography.Text strong>{tripMessages.experienceIntensityLabel}</Typography.Text>
              <Radio.Group
                value={draft.intensity}
                onChange={(event) => update({ intensity: event.target.value as ExperienceIntensity })}
              >
                <Space orientation="vertical" size="small">
                  {INTENSITY_OPTIONS.map((option) => (
                    <Radio key={option.value} value={option.value}>
                      {option.label} · {option.description}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
              <Typography.Text type="secondary">{tripMessages.experienceIntensityHint}</Typography.Text>
            </div>

            <div className="experience-field">
              <Typography.Text strong>{tripMessages.experienceAdviceLabel}</Typography.Text>
              <Input
                value={draft.advice}
                maxLength={MAX_ADVICE_LENGTH}
                placeholder={tripMessages.experienceAdvicePlaceholder}
                status={errors.advice === undefined ? undefined : 'error'}
                onChange={(event) => update({ advice: event.target.value })}
              />
              {errors.advice !== undefined && (
                <Typography.Text type="danger">{errors.advice}</Typography.Text>
              )}
            </div>

            <Alert type="warning" showIcon title={tripMessages.shareBoundaryTitle} description={tripMessages.experiencePrivacy} />

            {actionError !== null && (
              <Alert type="error" showIcon title={tripMessages.experienceFailed} description={actionError} />
            )}

            <Space>
              <Button type="primary" loading={submitting} onClick={submit}>
                {editing ? tripMessages.experienceSave : tripMessages.experienceSubmit}
              </Button>
              <Button onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
                {tripMessages.createCancel}
              </Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </main>
  );
}