import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ApiError, createTrip, loadAiItinerary, loadTrip } from '../api';
import { aiMessages } from '../ai/aiMessages';
import { toTripPrefill } from '../ai/snapshot';
import { CreditRestrictedNotice } from '../credit/CreditRestrictedNotice';
import { useMyCredit } from '../credit/CreditContext';
import { AreaCascader } from '../area/AreaCascader';
import { cityLabel } from '../area/areaOptions';
import { tripMessages } from '../i18n/tripMessages';
import { AmapPlacePicker } from '../map/amap/AmapPlacePicker';
import type { DemoUser, TripSummary, TripTravelMode } from '../types';
import { WeatherCard } from '../weather/WeatherCard';
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
  DEFAULT_MEETING_TIME,
  toCreateRequest,
  validateTripForm,
  type TripFieldErrors,
  type TripFormValues,
} from './tripForm';
import { addMeetingArea } from './meetingForm';
import { clearTripDraft, readTripDraft, writeTripDraft, type TripDraft } from './tripDraft';
import { cityPhoto } from './cityPhotos';
import { formatMonthDay } from './tripDateFormat';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_TAGS,
  INTEREST_TAGS,
  MAX_CAPACITY,
  MAX_STOPS,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_CAPACITY,
  TRIP_TRAVEL_MODE_LABELS,
  TRIP_TRAVEL_MODES,
} from './tripOptions';
import { statusLabel } from './tripStatus';

// The publish form is Chinese-only; keep the picker panel month names Chinese too.
dayjs.locale('zh-cn');

/** 行程简介长度上限（参考稿 42/200 口径）。 */
const MAX_NOTE_LENGTH = 200;

type Props = {
  currentUser: DemoUser;
  fromTripId?: number;
  aiItineraryId?: number;
};

export function TripCreatePage({ currentUser, fromTripId, aiItineraryId }: Props) {
  // AI 预填失败时保留 initialTripForm（今天日期），用户仍可手动填写发布（A12 / L-04）。
  const { restricted } = useMyCredit();
  const [values, setValues] = useState<TripFormValues>(() =>
    fromTripId === undefined ? initialTripForm() : emptyTripForm,
  );
  const [errors, setErrors] = useState<TripFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefillReady, setPrefillReady] = useState(false);
  const [prefillError, setPrefillError] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingDraftError, setMeetingDraftError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TripDraft | null>(() =>
    fromTripId === undefined && aiItineraryId === undefined ? readTripDraft() : null,
  );
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (aiItineraryId === undefined) {
      return;
    }
    let active = true;
    loadAiItinerary(currentUser.id, aiItineraryId)
      .then((snapshot) => {
        if (!active) {
          return;
        }
        setValues({ ...emptyTripForm, ...toTripPrefill(snapshot) });
        setPrefillReady(true);
      })
      .catch(() => {
        if (active) {
          setPrefillError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id, aiItineraryId]);

  const update = (patch: Partial<TripFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }));
  };

  const cityForSearch =
    values.destinationCode === ''
      ? undefined
      : cityLabel(values.destinationCode).replace(/市$/, '');
  const hasDestination = values.destinationCode !== '';

  /** 难度强度不新增后端字段：写入同名兴趣标签（最多保留 5 个）。
   *  新表单已预置默认难度，因此下拉框显示的就是真的会被提交的标签。 */
  const difficulty = DIFFICULTY_TAGS.find((tag) => values.tags.includes(tag)) ?? DEFAULT_DIFFICULTY;
  const setDifficulty = (tag: string) => {
    const rest = values.tags.filter(
      (item) => !(DIFFICULTY_TAGS as readonly string[]).includes(item),
    );
    update({ tags: [tag, ...rest].slice(0, MAX_TAGS) });
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

  const saveDraft = () => {
    setDraft(writeTripDraft(values));
    setDraftNotice(tripMessages.draftSaved);
  };

  const restoreDraft = () => {
    if (draft === null) {
      return;
    }
    setValues(draft.values);
    setDraft(null);
    setDraftNotice(tripMessages.draftRestored);
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
      const created = await createTrip(currentUser.id, toCreateRequest(values, aiItineraryId));
      clearTripDraft();
      window.location.hash = `#/trips/${created.id}`;
    } catch (error: unknown) {
      // 后端业务错误（如 AI 快照不属于当前用户）优先展示 message，而非错误码。
      setSubmitError(
        error instanceof ApiError
          ? (error.detail ?? error.code)
          : error instanceof Error
            ? error.message
            : 'UNKNOWN_ERROR',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const destination = cityLabel(values.destinationCode) || '目的地';
  const cover = cityPhoto(destination, destination.replace(/市$/, ''));
  const capacity = Number(values.capacity) || MIN_CAPACITY;
  const previewTrip: TripSummary = {
    id: 0,
    title: values.title.trim() === '' ? '你的行程标题' : values.title,
    destination,
    destination_code: values.destinationCode,
    province_code: '',
    province_name: '',
    start_date: values.startDate,
    end_date: values.endDate === '' ? values.startDate : values.endDate,
    stops: values.stops.length > 0 ? values.stops : ['至少写出两个途经点'],
    travel_mode: values.travelMode,
    meeting_areas: values.meetingAreas,
    meeting_time: values.meetingTime.trim() === '' ? null : values.meetingTime,
    tags: values.tags,
    capacity,
    joined_count: 1,
    status: 'recruiting',
    ending_soon: false,
    publisher: currentUser,
    created_at: new Date().toISOString(),
  };

  return (
    <main className="publish-page publish-page-v3">
      <header className="publish-hero">
        <div className="publish-hero-text">
          <Typography.Title level={2} className="publish-hero-title">
            {tripMessages.createTitle}
          </Typography.Title>
          <p className="publish-hero-sub">{tripMessages.createSubtitle}</p>
        </div>
        <span className="publish-hero-slogan" aria-hidden="true">
          {tripMessages.createSlogan}
        </span>
        <Button className="page-back" onClick={() => (window.location.hash = '#/')}>
          {tripMessages.createBackHome}
        </Button>
      </header>

      <div className="publish-layout">
        <div className="publish-main-col">
          <Card className="panel ai-import-card" data-testid="ai-import-banner">
            <span className="ai-import-icon" aria-hidden="true">
              ✦
            </span>
            <div className="ai-import-text">
              <h3 className="ai-import-title">{tripMessages.aiImportTitle}</h3>
              <p className="form-hint">{tripMessages.aiImportHint}</p>
            </div>
            <Button
              type="primary"
              data-testid="ai-import-action"
              onClick={() => (window.location.hash = '#/ai-planner')}
            >
              {tripMessages.aiImportAction} →
            </Button>
          </Card>

          {fromTripId !== undefined && (
            <Alert
              className="prefill-banner"
              type="info"
              showIcon
              title={tripMessages.referenceHint}
            />
          )}
          {aiItineraryId !== undefined && prefillReady && (
            <Alert
              className="prefill-banner"
              data-testid="ai-prefill-banner"
              type="info"
              showIcon
              title={aiMessages.prefillBanner}
              description={
                values.destinationCode === '' ? aiMessages.prefillDestinationHint : undefined
              }
            />
          )}
          {aiItineraryId !== undefined && prefillError && (
            <Alert
              className="prefill-banner"
              data-testid="ai-prefill-error"
              type="warning"
              showIcon
              title={aiMessages.prefillError}
            />
          )}
          {draft !== null && (
            <Alert
              className="prefill-banner"
              data-testid="trip-draft-banner"
              type="info"
              showIcon
              title={tripMessages.draftRestoreTitle}
              action={
                <Space size="small">
                  <Button size="small" type="primary" onClick={restoreDraft}>
                    {tripMessages.draftRestoreAction}
                  </Button>
                  <Button size="small" onClick={() => setDraft(null)}>
                    {tripMessages.draftDismissAction}
                  </Button>
                </Space>
              }
            />
          )}
          {draftNotice !== null && (
            <Alert className="prefill-banner" type="success" showIcon title={draftNotice} />
          )}

          <Card className="panel publish-panel">
            <h3 className="panel-title publish-panel-head">
              <span className="step-badge" aria-hidden="true">
                1
              </span>
              {tripMessages.sectionBasics}
              <span className="panel-hint">{tripMessages.basicsHint}</span>
            </h3>
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
                  placeholder="例如：珠海海岸一日游 · 美食与日落"
                  value={values.title}
                  onChange={(event) => update({ title: event.target.value })}
                />
              </Field>

              <div className="publish-field-row">
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
                      allowClear={false}
                      minDate={dayjs()}
                      value={isoToDayjs(values.startDate)}
                      onChange={(value) => {
                        // 点击即选中并关闭弹层；结束日期早于新的出发日期时自动跟随。
                        const startDate = dayjsToIso(value);
                        const patch: Partial<TripFormValues> = { startDate };
                        if (startDate !== '' && (values.endDate === '' || values.endDate < startDate)) {
                          patch.endDate = startDate;
                        }
                        if (startDate !== '' && values.meetingTime !== '') {
                          const nextMeeting = `${startDate}T${DEFAULT_MEETING_TIME}`;
                          if (values.meetingTime < nextMeeting) {
                            patch.meetingTime = nextMeeting;
                          }
                        }
                        update(patch);
                      }}
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
                      allowClear={false}
                      minDate={isoToDayjs(values.startDate) ?? dayjs()}
                      value={isoToDayjs(values.endDate)}
                      onChange={(value) => update({ endDate: dayjsToIso(value) })}
                      status={errors.endDate === undefined ? undefined : 'error'}
                    />
                  </div>
                </Field>
              </div>

              <Field
                label={tripMessages.fieldNoteTitle}
                htmlFor="trip-note"
                counter={`${values.note.length}/${MAX_NOTE_LENGTH}`}
                hint={tripMessages.hintNote}
              >
                <Input.TextArea
                  id="trip-note"
                  rows={3}
                  maxLength={MAX_NOTE_LENGTH}
                  value={values.note}
                  placeholder="吃牛庄、逛老街、打卡日月贝，最后在情侣路看日落。希望找到同样喜欢美食和海边风景的朋友，一起出发！"
                  onChange={(event) => update({ note: event.target.value })}
                />
              </Field>

              <div className="form-field" role="group" aria-label={tripMessages.fieldTags}>
                <span className="chip-row publish-tag-row">
                  {values.tags.map((tag) => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => update({ tags: values.tags.filter((item) => item !== tag) })}
                    >
                      {tag}
                    </Tag>
                  ))}
                  {tagInputOpen ? (
                    <Space.Compact size="small">
                      <Input
                        autoFocus
                        size="small"
                        value={tagDraft}
                        maxLength={MAX_TAG_LENGTH}
                        style={{ width: 132 }}
                        placeholder={`最多 ${MAX_TAG_LENGTH} 字`}
                        onChange={(event) => {
                          setTagDraft(event.target.value);
                          setTagError(null);
                        }}
                        onPressEnter={addCustomTag}
                        onBlur={() => {
                          if (tagDraft.trim() === '') {
                            setTagInputOpen(false);
                          }
                        }}
                      />
                      <Button size="small" onClick={addCustomTag} disabled={tagDraft.trim() === ''}>
                        添加
                      </Button>
                    </Space.Compact>
                  ) : (
                    <Button
                      size="small"
                      className="publish-tag-add"
                      data-testid="trip-add-tag"
                      onClick={() => setTagInputOpen(true)}
                    >
                      + 添加标签
                    </Button>
                  )}
                </span>
                <div className="publish-tag-options" role="group" aria-label={tripMessages.fieldTags}>
                  {INTEREST_TAGS.filter((tag) => !values.tags.includes(tag)).map((tag) => (
                    <Tag.CheckableTag
                      key={tag}
                      checked={false}
                      onChange={() => {
                        if (values.tags.length >= MAX_TAGS) {
                          setTagError(tripMessages.errorTagsLimit);
                          return;
                        }
                        update({ tags: [...values.tags, tag] });
                        setTagError(null);
                      }}
                    >
                      {tag}
                    </Tag.CheckableTag>
                  ))}
                </div>
                {tagError !== null && <Typography.Text type="warning">{tagError}</Typography.Text>}
                {errors.tags !== undefined && (
                  <Typography.Text type="danger">{errors.tags}</Typography.Text>
                )}
              </div>
            </div>
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title publish-panel-head">
              <span className="step-badge" aria-hidden="true">
                2
              </span>
              {tripMessages.sectionRoute}
              <span className="panel-hint">{tripMessages.routeSectionHint}</span>
              <Button
                size="small"
                className="panel-action ai-route-help"
                data-testid="route-ai-recommend"
                onClick={() => (window.location.hash = '#/ai-planner')}
              >
                <span aria-hidden="true">✦</span>
                <span className="ai-route-help-text">
                  <em>{tripMessages.routeRecommendAction}</em>
                  <i>{tripMessages.routeRecommendHint}</i>
                </span>
              </Button>
            </h3>
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
                  placeholder={tripMessages.stopsSearchPlaceholder}
                  emptyHint="至少两个途经点。请从搜索候选中选择，或直接点击地图。"
                />
              </Field>
              {!hasDestination && (
                <p className="form-hint">{tripMessages.waypointNeedsDestination}</p>
              )}
            </div>
          </Card>

          <Card className="panel publish-panel">
            <h3 className="panel-title publish-panel-head">
              <span className="step-badge" aria-hidden="true">
                3
              </span>
              {tripMessages.sectionExtras}
              <span className="panel-hint">{tripMessages.extrasHint}</span>
            </h3>
            <div className="form-stack">
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
                    placeholder="手输集合地点，或从下方地图选择"
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
                  mode="single"
                  ariaLabel="集合地点"
                  value={values.meetingAreas}
                  onChange={(next) => update({ meetingAreas: next })}
                  placeholder="搜索集合地点"
                  emptyHint="只填一个集合地点；再选或再输入会替换原来的地点。"
                  showMap
                  city={cityForSearch}
                />
              </Field>

              <div className="publish-field-row is-two">
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
        </div>

        <aside className="publish-side-col">
          <Card className="panel publish-preview-card">
            <div className="publish-preview-head">
              <div>
                <h3 className="panel-title">{tripMessages.previewLiveTitle}</h3>
                <span className="form-hint">{tripMessages.previewLiveSubtitle}</span>
              </div>
            </div>

            <article className="publish-preview-card-body">
              <div className="ppc-cover">
                {cover !== null ? (
                  <img src={cover} alt={`${destination}城市照片`} />
                ) : (
                  <span className="ppc-cover-fallback" aria-hidden="true" />
                )}
                <div className="ppc-cover-text">
                  <strong>{destination}</strong>
                  <span>
                    {values.startDate === '' ? '日期待定' : formatMonthDay(values.startDate)}
                    {values.endDate !== '' && values.endDate !== values.startDate
                      ? ` - ${formatMonthDay(values.endDate)}`
                      : ''}
                  </span>
                </div>
              </div>
              <h4 className="ppc-title">{previewTrip.title}</h4>
              <p className="ppc-meta">
                {values.startDate === '' ? '日期待定' : formatMonthDay(values.startDate)} ·{' '}
                {destination} · {TRIP_TRAVEL_MODE_LABELS[values.travelMode]}
              </p>
              {values.tags.length > 0 && (
                <div className="ppc-tags">
                  {values.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              )}
              {values.note.trim() !== '' && <p className="ppc-note">{values.note}</p>}
              {values.stops.length > 0 && (
                <div className="ppc-stops">
                  <span className="ppc-stops-title">
                    {tripMessages.previewStops(values.stops.length)}
                  </span>
                  <ol>
                    {values.stops.map((stop, index) => (
                      <li key={`${stop}-${index}`}>
                        <span className="ppc-stop-index">{index + 1}</span>
                        {stop}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="ppc-foot">
                <span className="ppc-people">
                  1 / {capacity} {tripMessages.peopleUnit}
                </span>
                <Progress
                  percent={Math.round((1 / Math.max(capacity, 1)) * 100)}
                  size="small"
                  showInfo={false}
                />
                <span className="ppc-status">{statusLabel('recruiting')}</span>
              </div>
              <div className="ppc-facts">
                <span>
                  {tripMessages.sideTravelMode}：{TRIP_TRAVEL_MODE_LABELS[values.travelMode]}
                </span>
                <span>
                  {tripMessages.sideDifficulty}：{difficulty}
                </span>
              </div>
            </article>
          </Card>

          <WeatherCard destinationCode={values.destinationCode} date={values.startDate} />

          <Card className="panel publish-companions-card" data-testid="companions-settings">
            <h3 className="panel-title">
              <span aria-hidden="true">👥</span> {tripMessages.companionsTitle}
            </h3>
            <div className="publish-companions-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="trip-capacity">
                  <span>{tripMessages.sideMembers}</span>
                </label>
                <Select
                  id="trip-capacity"
                  aria-label={tripMessages.sideMembers}
                  className="publish-select"
                  value={values.capacity === '' ? MIN_CAPACITY : Number(values.capacity)}
                  status={errors.capacity === undefined ? undefined : 'error'}
                  onChange={(value) => update({ capacity: String(value) })}
                  options={Array.from(
                    { length: MAX_CAPACITY - MIN_CAPACITY + 1 },
                    (_, index) => MIN_CAPACITY + index,
                  ).map((count) => ({ label: `${count} 人`, value: count }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="trip-travel-mode">
                  <span>{tripMessages.sideTravelMode}</span>
                </label>
                <Select
                  id="trip-travel-mode"
                  aria-label={tripMessages.fieldTravelMode}
                  className="publish-select"
                  value={values.travelMode}
                  onChange={(value) => update({ travelMode: value as TripTravelMode })}
                  options={TRIP_TRAVEL_MODES.map((mode) => ({
                    label: TRIP_TRAVEL_MODE_LABELS[mode],
                    value: mode,
                  }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="trip-difficulty">
                  <span>{tripMessages.sideDifficulty}</span>
                </label>
                <Select
                  id="trip-difficulty"
                  aria-label={tripMessages.sideDifficulty}
                  className="publish-select"
                  value={difficulty}
                  onChange={(value) => setDifficulty(String(value))}
                  options={DIFFICULTY_TAGS.map((tag) => ({ label: tag, value: tag }))}
                />
              </div>
            </div>
            <p className="form-hint">{tripMessages.companionsHint}</p>
            {errors.capacity !== undefined && (
              <Typography.Text type="danger">{errors.capacity}</Typography.Text>
            )}
          </Card>

          <Card className="panel safety-panel publish-safety">
            <h3 className="panel-title">
              <span aria-hidden="true">📍</span> {tripMessages.publishSafetyTitle}
            </h3>
            <ul className="safety-list">
              <li>{tripMessages.publishSafetyTipPublic}</li>
              <li>{tripMessages.publishSafetyTipClear}</li>
              <li>{tripMessages.publishSafetyTipReview}</li>
            </ul>
          </Card>

          <div className="publish-submit">
            {restricted && <CreditRestrictedNotice />}
            {restricted && (
              <p className="publish-guard-note">
                <a className="publish-guard-entry" href="#/credit/learning">
                  {tripMessages.publishGuardAction}
                </a>
                {tripMessages.publishGuardRemaining}
              </p>
            )}
            {submitError !== null && (
              <Alert
                type="error"
                showIcon
                title={tripMessages.failedTitle}
                description={submitError}
              />
            )}
            <div className="form-actions">
              <Button data-testid="trip-save-draft" onClick={saveDraft}>
                {tripMessages.saveDraft}
              </Button>
              <Button
                type="primary"
                loading={submitting}
                disabled={restricted}
                onClick={submit}
              >
                {tripMessages.createSubmit} →
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/** Wires a control to its field label and, when invalid, to its error text. */
function fieldProps(id: string, error?: string) {
  return error === undefined
    ? { id }
    : { id, 'aria-invalid': true, 'aria-describedby': `${id}-error` };
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