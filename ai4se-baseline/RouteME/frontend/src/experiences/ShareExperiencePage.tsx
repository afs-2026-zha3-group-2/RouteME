import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Radio, Skeleton, Space, Typography, message } from 'antd';
import { loadTrip, loadTripExperiences, shareExperience, uploadExperiencePhoto } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { SafetyNote } from '../safety/SafetyNote';
import { coverTone } from '../trips/coverTone';
import { StatusBadge } from '../trips/StatusBadge';
import { formatMonthDay, weekdayLabel } from '../trips/tripDateFormat';
import { statusLabel } from '../trips/tripStatus';
import type { DemoUser, ExperiencePhoto, TripDetail } from '../types';
import {
  ALLOWED_PHOTO_TYPES,
  emptyExperienceDraft,
  hasExperienceErrors,
  INTENSITY_OPTIONS,
  MAX_ADVICE_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  toExperienceRequest,
  validateExperience,
  type ExperienceDraft,
  type ExperienceErrors,
} from '../experiences/experienceForm';
import { shareEligibility } from '../experiences/shareEligibility';
import { ShareIcon } from '../experiences/shareIcons';

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
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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
          setDraft({
            content: mine.content,
            intensity: mine.intensity,
            advice: mine.advice,
            photos: mine.photos ?? [],
          });
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

  const removePhoto = (index: number) => {
    setPhotoError(null);
    setDraft((previous) => ({
      ...previous,
      photos: previous.photos.filter((_, position) => position !== index),
    }));
  };

  const movePhoto = (index: number, delta: number) => {
    setDraft((previous) => {
      const target = index + delta;
      if (target < 0 || target >= previous.photos.length) {
        return previous;
      }
      const photos = [...previous.photos];
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...previous, photos };
    });
  };

  const addPhotos = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    setPhotoError(null);
    let remaining = MAX_PHOTOS - draft.photos.length;
    if (remaining <= 0) {
      setPhotoError(tripMessages.experiencePhotoLimit);
      return;
    }
    const accepted: File[] = [];
    for (const file of files) {
      if (remaining <= 0) {
        setPhotoError(tripMessages.experiencePhotoLimit);
        break;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(tripMessages.experiencePhotoSize);
        return;
      }
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setPhotoError(tripMessages.experiencePhotoType);
        return;
      }
      accepted.push(file);
      remaining -= 1;
    }
    if (accepted.length === 0) {
      return;
    }
    setUploading(true);
    const uploaded: ExperiencePhoto[] = [];
    let failure: string | null = null;
    for (const file of accepted) {
      try {
        uploaded.push(await uploadExperiencePhoto(currentUser.id, tripId, file));
      } catch (caught: unknown) {
        failure = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
        break;
      }
    }
    if (uploaded.length > 0) {
      setDraft((previous) => ({
        ...previous,
        photos: [...previous.photos, ...uploaded].slice(0, MAX_PHOTOS),
      }));
    }
    if (failure !== null) {
      setPhotoError(`${tripMessages.experiencePhotoFailed}（${failure}）`);
    }
    setUploading(false);
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

  const eligibility = shareEligibility(trip, currentUser.id);

  if (eligibility.kind !== 'ready') {
    const blocked =
      eligibility.kind === 'notCompleted'
        ? {
            title: tripMessages.experienceNotCompleted,
            description: `${tripMessages.experienceNotCompletedHint}${statusLabel(eligibility.status)}`,
          }
        : {
            title: tripMessages.experienceNotParticipant,
            description: tripMessages.experienceNotParticipantHint,
          };
    return (
      <main className="form-page">
        <Alert
          type="warning"
          showIcon
          title={blocked.title}
          description={blocked.description}
          action={
            <Button onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
              {tripMessages.detailTitle}
            </Button>
          }
        />
      </main>
    );
  }

  const sameDay = trip.start_date === trip.end_date;
  const dates = sameDay
    ? `${formatMonthDay(trip.start_date)} · ${weekdayLabel(trip.start_date)}`
    : `${formatMonthDay(trip.start_date)} → ${formatMonthDay(trip.end_date)} · ${weekdayLabel(trip.start_date)}`;

  return (
    <main className="form-page share-page">
      <a className="detail-back" href={`#/trips/${tripId}`}>
        <ShareIcon name="left" />
        {tripMessages.detailTitle}
      </a>

      <div className="page-head">
        <div>
          <Typography.Title level={2} className="page-title">
            {editing ? tripMessages.experienceShareHeadingEdit : tripMessages.experienceShareHeading}
          </Typography.Title>
          <p className="page-sub">{tripMessages.experienceShareSub}</p>
        </div>
      </div>

      <div className="share-hero">
        <span
          className={`share-hero-cover cover-${coverTone(trip.destination_code)}`}
          aria-hidden="true"
        />
        <span className="share-hero-body">
          <b>{trip.title}</b>
          <span>
            {trip.destination} · {dates} · {trip.participants.length}{' '}
            {tripMessages.experienceCompanionsSuffix}
          </span>
        </span>
        <StatusBadge status={trip.status} />
      </div>

      <div className="publish-grid">
        <div className="publish-main">
          <Card className="panel publish-panel">
            <h3 className="panel-title">
              <ShareIcon name="spark" />
              {tripMessages.experiencePanelContent}
            </h3>
            <div className="field">
              <span className="label">
                {tripMessages.experienceContentLabel}
                <span className="share-required">*</span>
                <span className="share-counter">
                  {draft.content.length}/{MAX_CONTENT_LENGTH}
                </span>
              </span>
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
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title">
              <ShareIcon name="camera" />
              {tripMessages.experiencePhotoPanel}
            </h3>
            <div className="share-photos">
              {draft.photos.length === 0 ? (
                <div className="photo-empty">
                  <ShareIcon name="camera" />
                  <span>{tripMessages.experiencePhotoEmpty}</span>
                </div>
              ) : (
                <div className="photo-grid">
                  {draft.photos.map((photo, index) => (
                    <figure
                      className={`photo-tile${index === 0 ? ' is-cover' : ''}`}
                      key={photo.id}
                    >
                      <img
                        src={photo.url}
                        alt={`${tripMessages.experiencePhotoAlt} ${index + 1}`}
                      />
                      <div className="photo-actions">
                        {index > 0 && (
                          <button
                            type="button"
                            aria-label={tripMessages.experiencePhotoMoveUp}
                            onClick={() => movePhoto(index, -1)}
                          >
                            <ShareIcon name="left" />
                          </button>
                        )}
                        {index < draft.photos.length - 1 && (
                          <button
                            type="button"
                            aria-label={tripMessages.experiencePhotoMoveDown}
                            onClick={() => movePhoto(index, 1)}
                          >
                            <ShareIcon name="right" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={tripMessages.experiencePhotoRemove}
                          onClick={() => removePhoto(index)}
                        >
                          <ShareIcon name="x" />
                        </button>
                      </div>
                    </figure>
                  ))}
                </div>
              )}
              <div className="photo-note">
                <span>{tripMessages.experiencePhotoHint}</span>
                <span className={draft.photos.length >= MAX_PHOTOS ? 'over' : undefined}>
                  {draft.photos.length}/{MAX_PHOTOS}
                </span>
              </div>
              {photoError !== null && (
                <span className="photo-error" role="alert">
                  {photoError}
                </span>
              )}
              <div>
                <Button size="small" loading={uploading} onClick={() => photoInputRef.current?.click()}>
                  <ShareIcon name="plus" />
                  {tripMessages.experiencePhotoAdd}
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={tripMessages.experiencePhotoAdd}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    void addPhotos(files);
                  }}
                />
              </div>
            </div>
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title">
              <ShareIcon name="route" />
              {tripMessages.experienceIntensityLabel}
            </h3>
            <div className="field">
              <Radio.Group
              className="intensity-picker"
              aria-label={tripMessages.experienceIntensityLabel}
              value={draft.intensity}
              onChange={(event) =>
                update({ intensity: event.target.value as ExperienceDraft['intensity'] })
              }
            >
              {INTENSITY_OPTIONS.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  className={`int-card ${option.tone}${draft.intensity === option.value ? ' on' : ''}`}
                >
                  <b>{option.label}</b>
                  <span>{option.description}</span>
                </Radio>
              ))}
            </Radio.Group>
              <Typography.Text type="secondary">{tripMessages.experienceIntensityHint}</Typography.Text>
            </div>
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title">
              <ShareIcon name="info" />
              {tripMessages.experiencePanelAdvice}
            </h3>
            <div className="field">
              <span className="label">
                {tripMessages.experienceAdviceLabel}
                <span className="share-required">*</span>
              </span>
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

            <SafetyNote />

            {actionError !== null && (
              <Alert
                className="share-action-error"
                type="error"
                showIcon
                title={tripMessages.experienceFailed}
                description={actionError}
              />
            )}

            <Space className="form-actions">
              <Button type="primary" loading={submitting} disabled={uploading} onClick={submit}>
                <ShareIcon name="send" />
                {editing ? tripMessages.experienceSave : tripMessages.experienceSubmit}
              </Button>
              <Button type="link" onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
                {tripMessages.createCancel}
              </Button>
            </Space>
          </Card>
        </div>

        <aside className="publish-side">
          <Card className="panel publish-panel share-panel">
            <h3 className="panel-title">
              <ShareIcon name="compass" />
              {tripMessages.experienceGoesToTitle}
            </h3>
            <ul className="share-list">
              <li>
                <ShareIcon name="route" />
                <span>{tripMessages.experienceGoesToItems[0]}</span>
              </li>
              <li>
                <ShareIcon name="compass" />
                <span>{tripMessages.experienceGoesToItems[1]}</span>
              </li>
              <li>
                <ShareIcon name="copy" />
                <span>{tripMessages.experienceGoesToItems[2]}</span>
              </li>
            </ul>
          </Card>

          <Card className="panel publish-panel share-panel">
            <h3 className="panel-title">
              <ShareIcon name="shield" />
              {tripMessages.experienceBoundaryTitle}
            </h3>
            <ul className="share-list">
              <li>
                <ShareIcon name="check" />
                <span>{tripMessages.experienceBoundaryItems[0]}</span>
              </li>
              <li>
                <ShareIcon name="check" />
                <span>{tripMessages.experienceBoundaryItems[1]}</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </main>
  );
}