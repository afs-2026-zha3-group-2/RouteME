import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Card, DatePicker, Input, InputNumber, Space, Tag, Typography } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { createTrip, loadTrip } from '../api';
import { AreaCascader } from '../area/AreaCascader';
import { cityLabel } from '../area/areaOptions';
import { tripMessages } from '../i18n/tripMessages';
import { AmapPlacePicker } from '../map/amap/AmapPlacePicker';
import type { DemoUser, TripSummary } from '../types';
import { appDatePickerProps, appDateTimePickerProps } from '../utils/datePickerProps';
import {
  dayjsToIso,
  dayjsToLocalDateTime,
  isoToDayjs,
  localDateTimeToDayjs,
} from '../utils/dates';
import {
  addTag,
  emptyTripForm,
  initialTripForm,
  toCreateRequest,
  validateTripForm,
  type TripFieldErrors,
  type TripFormValues,
} from './tripForm';
import { addMeetingArea } from './meetingForm';
import { describePublishFailure } from './publishGuard';
import {
  INTEREST_TAGS,
  MAX_MEETING_AREAS,
  MAX_STOPS,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
} from './tripOptions';
import { TripCard } from './TripCard';

// The publish form is Chinese-only; keep the picker panel month names Chinese too.
dayjs.locale('zh-cn');

type Props = {
  currentUser: DemoUser;
  fromTripId?: number;
};

export function TripCreatePage({ currentUser, fromTripId }: Props) {
  const [values, setValues] = useState<TripFormValues>(() =>
    fromTripId === undefined ? initialTripForm() : emptyTripForm,
  );
  const [errors, setErrors] = useState<TripFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingDraftError, setMeetingDraftError] = useState<string | null>(null);
  const failure = describePublishFailure(submitError);

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
          destinationCode: source.destination_code,
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

  const cityForSearch =
    values.destinationCode === ''
      ? undefined
      : cityLabel(values.destinationCode).replace(/市$/, '');
  const hasDestination = values.destinationCode !== '';

  const previewTrip: TripSummary = {
    id: 0,
    title: values.title.trim() === '' ? '你的行程标题' : values.title,
    destination: cityLabel(values.destinationCode) || '目的地',
    destination_code: values.destinationCode,
    province_code: '',
    province_name: '',
    start_date: values.startDate,
    end_date: values.endDate === '' ? values.startDate : values.endDate,
    stops: values.stops.length > 0 ? values.stops : ['至少写出两个途经点'],
    meeting_areas: values.meetingAreas,
    meeting_time: values.meetingTime.trim() === '' ? null : values.meetingTime,
    tags: values.tags,
    capacity: Number(values.capacity) || 2,
    joined_count: 1,
    status: 'recruiting',
    ending_soon: false,
    publisher: currentUser,
    created_at: new Date().toISOString(),
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
    <main className="form-page publish-page">
      <div className="page-head">
        <div>
          <Typography.Title level={2} className="page-title">
            {tripMessages.createTitle}
          </Typography.Title>
          <p className="page-sub">{tripMessages.createSubtitle}</p>
        </div>
        <Button className="page-back" onClick={() => (window.location.hash = '#/')}>
          {tripMessages.backHome}
        </Button>
      </div>

      {fromTripId !== undefined && (
        <Alert
          className="prefill-banner"
          type="info"
          showIcon
          title={tripMessages.referenceHint}
        />
      )}

      <div className="publish-grid">
        <div className="publish-main">
          <Card className="panel publish-panel">
            <h3 className="panel-title">{tripMessages.sectionBasics}</h3>
            <div className="form-stack">
            <Field
              label={tripMessages.fieldTitle}
              htmlFor="trip-title"
              error={errors.title}
              required
              counter={`${values.title.length}/${MAX_TITLE_LENGTH}`}
            >
              <Input
                {...fieldProps('trip-title', errors.title)}
                maxLength={MAX_TITLE_LENGTH}
                value={values.title}
                onChange={(event) => update({ title: event.target.value })}
              />
            </Field>

            <Field
              label={tripMessages.fieldDestination}
              htmlFor="trip-destination"
              error={errors.destination}
              required
            >
              <AreaCascader
                id="trip-destination"
                ariaLabel={tripMessages.fieldDestination}
                ariaDescribedBy={
                  errors.destination !== undefined ? 'trip-destination-error' : undefined
                }
                invalid={errors.destination !== undefined}
                value={values.destinationCode}
                onChange={(code) => update({ destinationCode: code })}
                placeholder="请选择省 / 市"
              />
            </Field>

            <div className="form-row">
              <Field
                label={tripMessages.fieldStartDate}
                htmlFor="trip-start-date"
                error={errors.startDate}
                required
              >
<div className="trip-date-anchor">
                  <DatePicker
                    {...appDatePickerProps}
                    {...fieldProps('trip-start-date', errors.startDate)}
                    className="trip-date"
                    format="YYYY-MM-DD"
                    placeholder="选择日期"
                    locale={zhCN.DatePicker}
                    needConfirm
                    allowClear={false}
                    minDate={dayjs()}
                    value={isoToDayjs(values.startDate)}
                    onChange={(value) => update({ startDate: dayjsToIso(value) })}
                    status={errors.startDate === undefined ? undefined : 'error'}
                  />
                </div>
              </Field>
              <Field
                label={tripMessages.fieldEndDate}
                htmlFor="trip-end-date"
                error={errors.endDate}
                required
              >
<div className="trip-date-anchor">
                  <DatePicker
                    {...appDatePickerProps}
                    {...fieldProps('trip-end-date', errors.endDate)}
                    className="trip-date"
                    format="YYYY-MM-DD"
                    placeholder="选择日期"
                    locale={zhCN.DatePicker}
                    needConfirm
                    allowClear={false}
                    minDate={dayjs()}
                    value={isoToDayjs(values.endDate)}
                    onChange={(value) => update({ endDate: dayjsToIso(value) })}
                    status={errors.endDate === undefined ? undefined : 'error'}
                  />
                </div>
              </Field>
            </div>
            </div>
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title">{tripMessages.sectionRoute}</h3>
            <div className="form-stack">
            <Field label={tripMessages.fieldStops} htmlFor="trip-stops" error={errors.stops}>
              <AmapPlacePicker
                mode="multi"
                inputId="trip-stops"
                ariaLabel={tripMessages.fieldStops}
                invalid={errors.stops !== undefined}
                value={values.stops}
                onChange={(stops) => update({ stops })}
                max={MAX_STOPS}
                showMap
                city={cityForSearch}
                placeholder="搜索地点名称，必须能在地图上搜到"
                emptyHint="至少两个途经点。请从搜索候选中选择，或直接点击地图。"
              />
            </Field>
            {!hasDestination && (
              <p className="form-hint">{tripMessages.waypointNeedsDestination}</p>
            )}
          </div>
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title">{tripMessages.sectionExtras}</h3>
            <div className="form-stack">
              <Field
                label={tripMessages.fieldCapacity}
                htmlFor="trip-capacity"
                error={errors.capacity}
                required
                hint={tripMessages.hintCapacity}
              >
                <InputNumber
                  {...fieldProps('trip-capacity', errors.capacity)}
                  min={2}
                  max={12}
                  precision={0}
                  style={{ width: '100%' }}
                  value={values.capacity === '' ? null : Number(values.capacity)}
                  onChange={(value) => update({ capacity: value === null ? '' : String(value) })}
                  status={errors.capacity === undefined ? undefined : 'error'}
                />
              </Field>

              <Field
                label={tripMessages.fieldMeetingArea}
                htmlFor="trip-meeting-area"
                optional
                hint={tripMessages.hintMeeting}
                error={errors.meetingArea}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    id="trip-meeting-area"
                    value={meetingDraft}
                    placeholder="手输集合地点，或从下方地图多选（最多 3 个）"
                    onChange={(event) => {
                      setMeetingDraft(event.target.value);
                      setMeetingDraftError(null);
                    }}
                    onPressEnter={() => {
                      const result = addMeetingArea(values.meetingAreas, meetingDraft);
                      if (result.error !== null) {
                        setMeetingDraftError(result.error);
                        return;
                      }
                      update({ meetingAreas: result.next });
                      setMeetingDraft('');
                      setMeetingDraftError(null);
                    }}
                  />
                  <Button
                    onClick={() => {
                      const result = addMeetingArea(values.meetingAreas, meetingDraft);
                      if (result.error !== null) {
                        setMeetingDraftError(result.error);
                        return;
                      }
                      update({ meetingAreas: result.next });
                      setMeetingDraft('');
                      setMeetingDraftError(null);
                    }}
                    disabled={meetingDraft.trim() === ''}
                  >
                    添加
                  </Button>
                </Space.Compact>
                {meetingDraftError !== null && (
                  <Typography.Text type="warning">{meetingDraftError}</Typography.Text>
                )}
                <AmapPlacePicker
                  mode="multi"
                  max={MAX_MEETING_AREAS}
                  ariaLabel="集合地点"
                  value={values.meetingAreas}
                  onChange={(next) => update({ meetingAreas: next })}
                  placeholder="搜索集合地点"
                  emptyHint="可添加多个集合区域，选中后按顺序编号。"
                  showMap
                  city={cityForSearch}
                />
              </Field>

              <Field
                label={tripMessages.fieldMeetingTime}
                htmlFor="trip-meeting-time"
                error={errors.meetingTime}
                optional
              >
                <DatePicker
                  {...appDateTimePickerProps}
                  {...fieldProps('trip-meeting-time', errors.meetingTime)}
                  className="trip-meeting-time"
                  placeholder="选择日期与时间"
                  value={localDateTimeToDayjs(values.meetingTime)}
                  onChange={(value) => update({ meetingTime: dayjsToLocalDateTime(value) })}
                  status={errors.meetingTime === undefined ? undefined : 'error'}
                />
              </Field>

              <div className="form-row">
                <Field
                  label={tripMessages.fieldBudgetMin}
                  htmlFor="trip-budget-min"
                  error={errors.budget}
                  optional
                >
                  <InputNumber
                    {...fieldProps('trip-budget-min', errors.budget)}
                    min={0}
                    precision={0}
                    style={{ width: '100%' }}
                    value={values.budgetMin === '' ? null : Number(values.budgetMin)}
                    onChange={(value) => update({ budgetMin: value === null ? '' : String(value) })}
                    status={errors.budget === undefined ? undefined : 'error'}
                  />
                </Field>
                <Field label={tripMessages.fieldBudgetMax} htmlFor="trip-budget-max" optional>
                  <InputNumber
                    id="trip-budget-max"
                    min={0}
                    precision={0}
                    style={{ width: '100%' }}
                    value={values.budgetMax === '' ? null : Number(values.budgetMax)}
                    onChange={(value) => update({ budgetMax: value === null ? '' : String(value) })}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title">{tripMessages.sectionTags}</h3>
            <div className="form-stack">
            <div className="form-field" role="group" aria-label={tripMessages.fieldTags}>
              <span className="form-label">{tripMessages.fieldTags}</span>
              <span className="chip-row">
                {INTEREST_TAGS.map((tag) => {
                  const checked = values.tags.includes(tag);
                  return (
                    <Tag.CheckableTag
                      key={tag}
                      checked={checked}
                      onChange={() =>
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
                    </Tag.CheckableTag>
                  );
                })}
                {values.tags
                  .filter((tag) => !(INTEREST_TAGS as readonly string[]).includes(tag))
                  .map((tag) => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => update({ tags: values.tags.filter((item) => item !== tag) })}
                    >
                      {tag}
                    </Tag>
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

            <Field label={tripMessages.fieldNote} htmlFor="trip-note" optional>
              <Input.TextArea
                id="trip-note"
                rows={3}
                value={values.note}
                onChange={(event) => update({ note: event.target.value })}
              />
            </Field>

            {failure?.kind === 'creditGuard' && (
              <Alert
                className="publish-guard"
                type="warning"
                showIcon
                title={tripMessages.publishGuardTitle}
                description={
                  <>
                    <p className="publish-guard-body">{tripMessages.publishGuardBody}</p>
                    <p className="publish-guard-note">{tripMessages.publishGuardRemaining}</p>
                  </>
                }
                action={
                  <Button type="primary" href="#/credit/learning">
                    {tripMessages.publishGuardAction}
                  </Button>
                }
              />
            )}

            {failure?.kind === 'generic' && (
              <Alert
                type="error"
                showIcon
                title={tripMessages.failedTitle}
                description={failure.code}
              />
            )}

            <div className="form-actions">
              <Button type="primary" loading={submitting} onClick={submit}>
                {tripMessages.createSubmit}
              </Button>
              <Button onClick={() => (window.location.hash = '#/')}>
                {tripMessages.createCancel}
              </Button>
            </div>
            </div>
          </Card>
        </div>

        <aside className="publish-side">
          <div>
            <span className="preview-label">{tripMessages.previewLabel}</span>
            <TripCard trip={previewTrip} preview />
          </div>
          <Card className="panel safety-panel">
            <h3 className="panel-title">{tripMessages.publishSafetyTitle}</h3>
            <ul className="safety-list">
              <li>{tripMessages.publishSafetyTipPublic}</li>
              <li>{tripMessages.publishSafetyTipClear}</li>
              <li>{tripMessages.publishSafetyTipReview}</li>
            </ul>
          </Card>
        </aside>
      </div>
    </main>
  );
}

/** Wires a control to its field label and, when invalid, to its error text. */
function fieldProps(id: string, error?: string) {
  return error === undefined ? { id } : { id, 'aria-invalid': true, 'aria-describedby': `${id}-error` };
}

function Field({
  label,
  htmlFor,
  error,
  required = false,
  optional = false,
  counter,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  counter?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={htmlFor}>
        <span>{label}</span>
        {required && (
          <span className="req" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="opt">选填</span>}
        {counter !== undefined && <span className="counter">{counter}</span>}
      </label>
      {children}
      {error !== undefined && (
        <Typography.Text type="danger" id={`${htmlFor}-error`}>
          {error}
        </Typography.Text>
      )}
      {hint !== undefined && <span className="form-hint">{hint}</span>}
    </div>
  );
}