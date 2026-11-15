import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Input, Select, Space, Typography } from 'antd';
import { createTrip, loadTrip } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser } from '../types';
import {
  emptyTripForm,
  toCreateRequest,
  validateTripForm,
  type TripFieldErrors,
  type TripFormValues,
} from './tripForm';
import { DESTINATIONS, INTEREST_TAGS, MAX_TAGS } from './tripOptions';

type Props = {
  currentUser: DemoUser;
  fromTripId?: number;
};

export function TripCreatePage({ currentUser, fromTripId }: Props) {
  const [values, setValues] = useState<TripFormValues>(emptyTripForm);
  const [errors, setErrors] = useState<TripFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (fromTripId === undefined) {
      return;
    }
    let active = true;
    loadTrip(currentUser.id, fromTripId)
      .then((source) => {
        if (!active) {
          return;
        }
        setValues({
          ...emptyTripForm,
          destination: source.destination,
          stopsText: source.stops.join('\n'),
          tags: source.tags.slice(0, MAX_TAGS),
          capacity: '',
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser.id, fromTripId]);

  const update = (patch: Partial<TripFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }));
  };

  const submit = async () => {
    const found = validateTripForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createTrip(currentUser.id, toCreateRequest(values));
      window.location.hash = `#/trips/${created.id}`;
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="form-page">
      <Card className="form-card">
        <Space orientation="vertical" size="middle" className="home-stack">
          <Typography.Title level={2} className="trip-heading">
            {tripMessages.createTitle}
          </Typography.Title>

                    {fromTripId !== undefined && (
                      <Alert type="info" showIcon title={tripMessages.referenceHint} />
                    )}

          <Field label={tripMessages.fieldTitle} error={errors.title}>
            <Input value={values.title} onChange={(event) => update({ title: event.target.value })} />
          </Field>

          <Field label={tripMessages.fieldDestination} error={errors.destination}>
            <Select
              value={values.destination}
              options={[
                { value: '', label: tripMessages.anyDestination },
                ...DESTINATIONS.map((destination) => ({ value: destination, label: destination })),
              ]}
              onChange={(destination) => update({ destination })}
            />
          </Field>

          <div className="form-grid">
            <Field label={tripMessages.fieldStartDate} error={errors.startDate}>
              <Input type="date" value={values.startDate} onChange={(event) => update({ startDate: event.target.value })} />
            </Field>
            <Field label={tripMessages.fieldEndDate} error={errors.endDate}>
              <Input type="date" value={values.endDate} onChange={(event) => update({ endDate: event.target.value })} />
            </Field>
          </div>

          <Field label={tripMessages.fieldStops} error={errors.stops}>
            <Input.TextArea
              rows={4}
              value={values.stopsText}
              onChange={(event) => update({ stopsText: event.target.value })}
            />
          </Field>

          <Field label={tripMessages.fieldCapacity} error={errors.capacity}>
            <Input
              type="number"
              min={2}
              max={12}
              value={values.capacity}
              onChange={(event) => update({ capacity: event.target.value })}
            />
          </Field>

          <Field label={tripMessages.fieldMeetingArea}>
            <Input value={values.meetingArea} onChange={(event) => update({ meetingArea: event.target.value })} />
          </Field>

          <div className="form-grid">
            <Field label={tripMessages.fieldBudgetMin} error={errors.budget}>
              <Input
                type="number"
                min={0}
                value={values.budgetMin}
                onChange={(event) => update({ budgetMin: event.target.value })}
              />
            </Field>
            <Field label={tripMessages.fieldBudgetMax}>
              <Input
                type="number"
                min={0}
                value={values.budgetMax}
                onChange={(event) => update({ budgetMax: event.target.value })}
              />
            </Field>
          </div>

          <div className="form-field">
            <span className="form-label">{tripMessages.fieldTags}</span>
            <span className="chip-row">
              {INTEREST_TAGS.map((tag) => {
                const checked = values.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={checked ? 'chip on' : 'chip'}
                    aria-pressed={checked}
                    onClick={() =>
                      update({
                        tags: checked
                          ? values.tags.filter((item) => item !== tag)
                          : values.tags.length >= MAX_TAGS
                            ? values.tags
                            : [...values.tags, tag],
                      })
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </span>
            {errors.tags !== undefined && (
              <Typography.Text type="danger">{errors.tags}</Typography.Text>
            )}
          </div>

          <Field label={tripMessages.fieldNote}>
            <Input.TextArea rows={3} value={values.note} onChange={(event) => update({ note: event.target.value })} />
          </Field>

          {submitError !== null && (
            <Alert type="error" showIcon title={tripMessages.failedTitle} description={submitError} />
          )}

          <Space>
            <Button type="primary" loading={submitting} onClick={submit}>
              {tripMessages.createSubmit}
            </Button>
            <Button onClick={() => (window.location.hash = '#/')}>{tripMessages.createCancel}</Button>
          </Space>
        </Space>
      </Card>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      {children}
      {error !== undefined && <Typography.Text type="danger">{error}</Typography.Text>}
    </label>
  );
}