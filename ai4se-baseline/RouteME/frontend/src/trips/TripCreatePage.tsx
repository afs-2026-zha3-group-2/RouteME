import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Input, Space, Typography } from 'antd';
import { createTrip, loadTrip } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { PlacePicker } from '../map/PlacePicker';
import type { DemoUser } from '../types';
import {
  addTag,
  emptyTripForm,
  toCreateRequest,
  validateTripForm,
  type TripFieldErrors,
  type TripFormValues,
} from './tripForm';
import {
  INTEREST_TAGS,
  MAX_STOPS,
  MAX_TAGS,
  MAX_TAG_LENGTH,
} from './tripOptions';

type Props = {
  currentUser: DemoUser;
  fromTripId?: number;
};

export function TripCreatePage({ currentUser, fromTripId }: Props) {
  const [values, setValues] = useState<TripFormValues>(emptyTripForm);
  const [errors, setErrors] = useState<TripFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [meetingMapOpen, setMeetingMapOpen] = useState(false);

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
          stops: source.stops.slice(0, MAX_STOPS),
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

  const addCustomTag = () => {
    const next = addTag(values.tags, tagDraft);
    if (next === values.tags) {
      if (tagDraft.trim() !== '') {
        setTagError(
          values.tags.length >= MAX_TAGS
            ? tripMessages.errorTagsLimit
            : '这个标签已经添加过了',
        );
      }
      return;
    }
    update({ tags: next });
    setTagDraft('');
    setTagError(null);
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
            <PlacePicker
              mode="single"
              kinds={['city']}
              value={values.destination === '' ? [] : [values.destination]}
              onChange={(next) => update({ destination: next[0] ?? '' })}
              placeholder="搜索城市名，或直接在地图上点选"
              emptyHint="目的地按城市选择；输入城市名会即时匹配地图上的位置。"
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
            <PlacePicker
              mode="multi"
              value={values.stops}
              onChange={(stops) => update({ stops })}
              max={MAX_STOPS}
              placeholder="搜索地点名称，必须能在地图上搜到"
              emptyHint="至少两个途经点。输错的名字不会被接受，请从候选里选或直接点地图。"
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

          <div className="form-field">
            <span className="form-label">{tripMessages.fieldMeetingArea}</span>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={values.meetingArea}
                placeholder="可以直接输入集合地点，或在地图上选"
                onChange={(event) => update({ meetingArea: event.target.value })}
              />
              <Button onClick={() => setMeetingMapOpen((previous) => !previous)}>
                {meetingMapOpen ? '收起地图' : '地图选点'}
              </Button>
            </Space.Compact>
            {meetingMapOpen && (
              <PlacePicker
                mode="single"
                value={values.meetingArea === '' ? [] : [values.meetingArea]}
                onChange={(next) => update({ meetingArea: next[0] ?? '' })}
                placeholder="搜索集合地点"
                emptyHint="选中后会把地点名写进集合区域。"
              />
            )}
          </div>

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
              {values.tags
                .filter((tag) => !(INTEREST_TAGS as readonly string[]).includes(tag))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="chip on"
                    aria-pressed
                    onClick={() => update({ tags: values.tags.filter((item) => item !== tag) })}
                  >
                    {tag} ×
                  </button>
                ))}
            </span>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <Input
                value={tagDraft}
                maxLength={MAX_TAG_LENGTH}
                placeholder={`自定义兴趣标签（最多 ${MAX_TAGS} 个，每个 ${MAX_TAG_LENGTH} 字以内）`}
                onChange={(event) => {
                  setTagDraft(event.target.value);
                  setTagError(null);
                }}
                onPressEnter={addCustomTag}
              />
              <Button onClick={addCustomTag} disabled={tagDraft.trim() === ''}>
                添加标签
              </Button>
            </Space.Compact>
            {tagError !== null && <Typography.Text type="warning">{tagError}</Typography.Text>}
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
    <div className="form-field">
      <span className="form-label">{label}</span>
      {children}
      {error !== undefined && <Typography.Text type="danger">{error}</Typography.Text>}
    </div>
  );
}