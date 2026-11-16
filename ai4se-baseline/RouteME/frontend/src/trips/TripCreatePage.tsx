import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Cascader, Input, Space, Typography } from 'antd';
import { createTrip, loadTrip } from '../api';
import { AREA_PROVINCES, codesForCityName, DESTINATION_OPTIONS } from '../areas/areaCatalog';
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
          destinationCode: codesForCityName(source.destination)?.[1] ?? '',
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

          <Field label={tripMessages.fieldTitle} htmlFor="trip-title" error={errors.title}>
                                <Input
                                  {...fieldProps('trip-title', errors.title)}
                                  value={values.title}
                                  onChange={(event) => update({ title: event.target.value })}
                                />
                              </Field>

                              <Field
            label={tripMessages.fieldDestination}
            htmlFor="trip-destination"
            error={errors.destination}
          >
            <Cascader
              id="trip-destination"
              options={DESTINATION_OPTIONS}
              value={destinationPath(values.destinationCode)}
              onChange={(next) =>
                update({ destinationCode: Array.isArray(next) && next.length === 2 ? String(next[1]) : '' })
              }
              placeholder="选择省 / 市（必须选到城市）"
              aria-label={tripMessages.fieldDestination}
              aria-invalid={errors.destination !== undefined || undefined}
              aria-describedby={errors.destination !== undefined ? 'trip-destination-error' : undefined}
              allowClear
            />
          </Field>

          <div className="form-grid">
                      <Field label={tripMessages.fieldStartDate} htmlFor="trip-start-date" error={errors.startDate}>
                        <Input
                          {...fieldProps('trip-start-date', errors.startDate)}
                          type="date"
                          value={values.startDate}
                          onChange={(event) => update({ startDate: event.target.value })}
                        />
                      </Field>
                      <Field label={tripMessages.fieldEndDate} htmlFor="trip-end-date" error={errors.endDate}>
                        <Input
                          {...fieldProps('trip-end-date', errors.endDate)}
                          type="date"
                          value={values.endDate}
                          onChange={(event) => update({ endDate: event.target.value })}
                        />
                      </Field>
                    </div>

                    <Field label={tripMessages.fieldStops} htmlFor="trip-stops" error={errors.stops}>
                      <PlacePicker
                        mode="multi"
                        inputId="trip-stops"
                        ariaLabel={tripMessages.fieldStops}
                        invalid={errors.stops !== undefined}
                        value={values.stops}
                        onChange={(stops) => update({ stops })}
                        max={MAX_STOPS}
                        placeholder="搜索地点名称，必须能在地图上搜到"
                        emptyHint="至少两个途经点。输错的名字不会被接受，请从候选里选或直接点地图。"
                      />
                    </Field>

                    <Field label={tripMessages.fieldCapacity} htmlFor="trip-capacity" error={errors.capacity}>
                      <Input
                        {...fieldProps('trip-capacity', errors.capacity)}
                        type="number"
                        min={2}
                        max={12}
                        value={values.capacity}
                        onChange={(event) => update({ capacity: event.target.value })}
                      />
                    </Field>

                    <div className="form-field">
                      <label className="form-label" htmlFor="trip-meeting-area">
                        {tripMessages.fieldMeetingArea}
                      </label>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          id="trip-meeting-area"
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
                          ariaLabel="集合地点"
                          value={values.meetingArea === '' ? [] : [values.meetingArea]}
                          onChange={(next) => update({ meetingArea: next[0] ?? '' })}
                          placeholder="搜索集合地点"
                          emptyHint="选中后会把地点名写进集合区域。"
                        />
                      )}
                    </div>

                    <div className="form-grid">
                      <Field label={tripMessages.fieldBudgetMin} htmlFor="trip-budget-min" error={errors.budget}>
                        <Input
                          {...fieldProps('trip-budget-min', errors.budget)}
                          type="number"
                          min={0}
                          value={values.budgetMin}
                          onChange={(event) => update({ budgetMin: event.target.value })}
                        />
                      </Field>
                      <Field label={tripMessages.fieldBudgetMax} htmlFor="trip-budget-max">
                        <Input
                          id="trip-budget-max"
                          type="number"
                          min={0}
                          value={values.budgetMax}
                          onChange={(event) => update({ budgetMax: event.target.value })}
                        />
                      </Field>
                    </div>

          <div className="form-field" role="group" aria-label={tripMessages.fieldTags}>
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

          <Field label={tripMessages.fieldNote} htmlFor="trip-note">
                      <Input.TextArea
                        id="trip-note"
                        rows={3}
                        value={values.note}
                        onChange={(event) => update({ note: event.target.value })}
                      />
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

/** Cascader 需要「省 → 市」两级路径，而表单只保存市级代码。 */
function destinationPath(code: string): string[] {
  if (code === '') {
    return [];
  }
  const province = AREA_PROVINCES.find((item) => item.cities.some((city) => city.code === code));
  return province === undefined ? [] : [province.code, code];
}

/** Wires a control to its field label and, when invalid, to its error text. */
function fieldProps(id: string, error?: string) {
  return error === undefined ? { id } : { id, 'aria-invalid': true, 'aria-describedby': `${id}-error` };
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error !== undefined && (
        <Typography.Text type="danger" id={`${htmlFor}-error`}>
          {error}
        </Typography.Text>
      )}
    </div>
  );
}