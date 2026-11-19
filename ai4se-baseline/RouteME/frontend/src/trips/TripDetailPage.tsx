import { useEffect, useRef, useState } from 'react';
import { destinationLabel, findCity } from '../area/areaOptions';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Image,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  applyForTrip,
  cancelApplication,
  completeTrip,
  loadAiItinerary,
  loadMyApplications,
  loadTrip,
  loadTripApplications,
  loadTripExperiences,
  loadTripFinance,
  saveTripMeeting,
} from '../api';
import { aiMessages } from '../ai/aiMessages';
import { centsToYuan, sumBudgetCents } from '../ai/budgetMath';
import { tripMessages } from '../i18n/tripMessages';
import { financeMessages } from '../i18n/financeMessages';
import { financeEntryVisible } from '../finance/financeEligibility';
import { useStudentGate } from '../identity/StudentVerificationGate';
import { insuranceStatusLabel } from '../finance/financeLabels';
import { CreditRestrictedNotice } from '../credit/CreditRestrictedNotice';
import { useMyCredit } from '../credit/CreditContext';
import { intensityLabel } from '../experiences/experienceForm';
import { ExperienceLikeButton } from '../experiences/ExperienceLikeButton';
import { ShareIcon } from '../experiences/shareIcons';
import { meetingAreaText, meetingTimeText } from '../chat/chatMeeting';
import { AmapTripMap } from '../map/amap/AmapTripMap';
import { formatDistance, formatDuration, type RoutePlan } from '../map/amap/AmapService';
import { AmapPlacePicker } from '../map/amap/AmapPlacePicker';
import { shareEligibility } from '../experiences/shareEligibility';
import { GrowthBadge } from '../growth/GrowthBadge';
import { publisherSummary } from '../profile/profileDisplay';
import { creditLine, creditRestrictedBadge, creditTone } from '../profile/creditDisplay';
import { useUserCredits } from '../profiles/useUserCredits';
import { useGrowthLevels } from '../profiles/useGrowthLevels';
import { ReportModal } from '../safety/ReportModal';
import { Avatar } from '../shell/Avatar';
import type { AiItinerarySnapshot, DemoUser, Experience, InsuranceSummary, TripApplication } from '../types';
import { WeatherCard } from '../weather/WeatherCard';
import { applicationEntryState, applicationErrorMessage } from './applicationEntry';
import { CompanionCard } from './CompanionCard';
import { tripCompanions } from './companions';
import {
  MAX_MEETING_AREA_LENGTH,
  addMeetingArea,
  emptyMeetingForm,
  isMeetingIncomplete,
  meetingFormFrom,
  toMeetingRequest,
  validateMeetingForm,
  type MeetingFieldErrors,
  type MeetingFormValues,
} from './meetingForm';
import { TRIP_TRAVEL_MODE_LABELS } from './tripOptions';
import { statusColor, statusLabel } from './tripStatus';
import { StopCompletionPicker } from './StopCompletionPicker';
import { allChecked } from './stopCompletion';
import { TripCancelModal } from './TripCancelModal';
import { TripLeaveModal } from './TripLeaveModal';
import { TripRouteModal } from './TripRouteModal';
import { leaveResultText } from './leavePreview';
import { cancelReasonLabel } from './tripCancel';
import { useTrip } from './useTrip';
import { useProfile } from '../profiles/ProfileContext';
import { appDateTimePickerProps } from '../utils/datePickerProps';
import { dayjsToLocalDateTime, localDateTimeToDayjs } from '../utils/dates';

const MAX_MESSAGE_LENGTH = 120;

/** 详情头部徽标：有出发地时显示「出发 → 目的地」（均去「市」简称），否则只显示目的地。 */
function destinationTagText(trip: { departure?: string | null; destination: string; destination_code: string }): string {
  const destination = findCity(trip.destination_code)?.cityDisplayName ?? trip.destination;
  const departure = (trip.departure ?? '').replace(/市$/, '');
  if (departure === '') {
    return destinationLabel(trip.destination_code) || trip.destination;
  }
  return `${departure} → ${destination.replace(/市$/, '')}`;
}

type Props = {
  currentUser: DemoUser;
  tripId: number;
};

type Feedback = {
  tone: 'error' | 'warning';
  title: string;
  detail?: string;
};

function pickLatestApplication(
  applications: TripApplication[],
  tripId: number,
): TripApplication | null {
  return (
    applications
      .filter((application) => application.trip_id === tripId)
      .sort((left, right) => right.id - left.id)[0] ?? null
  );
}

/** 连接点首站：有集合时间就写「HH:mm 集合出发」，缺省只写集合出发。 */
function firstStopMeta(meetingTime: string | null): string {
  const clock = meetingTime?.slice(11, 16) ?? '';
  return /^\d{2}:\d{2}$/.test(clock) ? `${clock} 集合出发` : '集合出发';
}

/** 相邻两站的分段信息：距离与时间只来自高德，没有分段就留空，不编造。 */
function legMeta(leg: RoutePlan['legs'][number] | undefined, modeLabel: string): string {
  if (leg === undefined) {
    return '';
  }
  return `约 ${formatDistance(leg.distanceMeters)} · ${modeLabel} ${formatDuration(leg.durationSeconds)}`;
}

/** 出行方式展示名：详情页地图把公共交通与未填写按步行示意。 */
function routeModeLabel(mode: string): string {
  if (mode === 'driving') {
    return '驾车';
  }
  return mode === 'bicycling' ? '骑行' : '步行';
}

export function TripDetailPage({ currentUser, tripId }: Props) {
  const { state, reload } = useTrip(currentUser.id, tripId);
  const { openProfile } = useProfile();
  const { restricted, refresh: refreshCredit } = useMyCredit();
  const publisherId = state.status === 'ready' ? state.trip.publisher.id : 0;
  const publisherCredits = useUserCredits(publisherId > 0 ? [publisherId] : [], currentUser.id);
  const growthIds =
    state.status === 'ready'
      ? [
          state.trip.publisher.id,
          ...tripCompanions(state.trip.participants, state.trip.publisher.id).map(
            (member) => member.id,
          ),
        ]
      : [];
  const growth = useGrowthLevels(growthIds, currentUser.id);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [completing, setCompleting] = useState(false);
  const [myApplication, setMyApplication] = useState<TripApplication | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [applyMessage, setApplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'cancelApply' | null>(null);
  const [completeChecked, setCompleteChecked] = useState<number[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [experiences, setExperiences] = useState<Experience[] | null>(null);
  const [insurance, setInsurance] = useState<InsuranceSummary | null>(null);
  // 地图解析出的高德路线：连接点时间轴的分段距离/时间只从这里取。
  const [tripRoute, setTripRoute] = useState<RoutePlan | null>(null);
  const studentGate = useStudentGate(currentUser);

  const updateExperience = (next: Experience) => {
    setExperiences((previous) =>
      previous === null ? previous : previous.map((item) => (item.id === next.id ? next : item)),
    );
  };

  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState<MeetingFormValues>(emptyMeetingForm());
  const [meetingErrors, setMeetingErrors] = useState<MeetingFieldErrors>({});
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingDraftError, setMeetingDraftError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [focusStop, setFocusStop] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiItinerarySnapshot | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    loadMyApplications(currentUser.id)
      .then((applications) => {
        if (active) {
          setMyApplication(pickLatestApplication(applications, tripId));
        }
      })
      .catch(() => undefined);
    loadTripExperiences(currentUser.id, tripId)
      .then((loaded) => {
        if (active) {
          setExperiences(loaded);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser.id, tripId]);

  // 行程详情「安全保障」区的保险状态：仅发布者 / ACCEPTED 同行者请求，失败时退回未购买。
  useEffect(() => {
    if (state.status !== 'ready' || !financeEntryVisible(state.trip, currentUser.id)) {
      setInsurance(null);
      return;
    }
    let active = true;
    loadTripFinance(currentUser.id, state.trip.id)
      .then((loaded) => {
        if (active) {
          setInsurance(loaded.insurance);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser.id, tripId, state.status]);

  useEffect(() => {
    const isPublisher = state.status === 'ready' && state.trip.publisher.id === currentUser.id;
    if (!isPublisher) {
      return;
    }
    loadTripApplications(currentUser.id, tripId)
      .then((applications) => {
        setPendingCount(applications.filter((application) => application.status === 'pending').length);
      })
      .catch(() => undefined);
  }, [currentUser.id, tripId, state]);

  // AI 来源行程加载快照摘要；快照不可读时只隐藏摘要，不影响详情主体（L-05）。
  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }
    const itineraryId = state.trip.ai_itinerary_id;
    if (itineraryId === null || itineraryId === undefined) {
      setAiSummary(null);
      return;
    }
    let active = true;
    loadAiItinerary(currentUser.id, itineraryId)
      .then((snapshot) => {
        if (active) {
          setAiSummary(snapshot);
        }
      })
      .catch(() => {
        if (active) {
          setAiSummary(null);
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id, state]);

  const refreshMyApplication = async () => {
    const applications = await loadMyApplications(currentUser.id);
    setMyApplication(pickLatestApplication(applications, tripId));
  };

  const showActionError = (error: unknown) => {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    setFeedback({ tone: 'error', title: tripMessages.applyFailed, detail: code });
  };

  const complete = async () => {
    setCompleting(true);
    setFeedback(null);
    try {
      await completeTrip(currentUser.id, tripId, completeChecked);
      reload();
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      setFeedback({
        tone: 'error',
        title: code === 'FORBIDDEN' ? tripMessages.detailForbidden : tripMessages.detailCompleteFailed,
        detail: code,
      });
      reload();
    } finally {
      setCompleting(false);
    }
  };

  const cancelMyApplication = async () => {
    if (myApplication === null) {
      return;
    }
    setCancelling(true);
    setFeedback(null);
    try {
      const cancelled = await cancelApplication(currentUser.id, myApplication.id);
      setMyApplication(cancelled);
    } catch (error: unknown) {
      showActionError(error);
    } finally {
      setCancelling(false);
    }
  };

  const openMeeting = (meetingAreas: string[] | null, meetingTime: string | null) => {
    setMeetingForm(meetingFormFrom({ meeting_areas: meetingAreas, meeting_time: meetingTime }));
    setMeetingErrors({});
    setMeetingDraft('');
    setMeetingDraftError(null);
    setMeetingOpen(true);
  };

  const submitMeeting = async (endDate: string) => {
    const errors = validateMeetingForm(meetingForm, endDate);
    setMeetingErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setMeetingSaving(true);
    setFeedback(null);
    try {
      await saveTripMeeting(currentUser.id, tripId, toMeetingRequest(meetingForm));
      setMeetingOpen(false);
      message.success(tripMessages.meetingSaved);
      reload();
    } catch (error: unknown) {
      showActionError(error);
    } finally {
      setMeetingSaving(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <main className="form-page">
        <Card className="form-card">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </main>
    );
  }

  if (state.status === 'failed') {
    return (
      <main className="form-page">
        <Alert
          type="error"
          showIcon
          title={state.code === 'TRIP_NOT_FOUND' ? tripMessages.detailNotFound : tripMessages.failedTitle}
          description={state.code}
          action={
            <Button onClick={() => (window.location.hash = '#/')}>{tripMessages.backHome}</Button>
          }
        />
      </main>
    );
  }

  const { trip } = state;
  const entry = applicationEntryState(trip, currentUser.id, myApplication);
  const isPublisher = entry.kind === 'publisher';
  const isCompleted = trip.status === 'completed';
  const isCancelled = trip.status === 'cancelled';
  const participant = trip.participants.some((member) => member.id === currentUser.id);
  const companions = tripCompanions(trip.participants, trip.publisher.id);
  const canShare = shareEligibility(trip, currentUser.id).kind === 'ready';
  const hasShared = experiences?.some((experience) => experience.author.id === currentUser.id) ?? false;
  const budget =
    trip.budget_min_cents === null
      ? null
      : `${trip.budget_min_cents / 100}${trip.budget_max_cents === null ? '' : ` – ${trip.budget_max_cents / 100}`} 元`;

  const mapCity = findCity(trip.destination_code)?.cityDisplayName.replace(/市$/, '') ?? trip.destination;
  const cityForSearch = mapCity.replace(/市$/, '');
  const hasStops = trip.stops.length > 0;
  // 高德路线封装在本基线只支持步行 / 驾车 / 骑行：公共交通与未填写按步行折线示意。
  const mapTravelMode =
    trip.travel_mode === 'driving' || trip.travel_mode === 'bicycling' ? trip.travel_mode : 'walking';
  const mapModeLabel = routeModeLabel(mapTravelMode);
  const focusPlace = (name: string) => {
    setFocusStop(name);
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const confirmTitle =
    confirmAction === 'complete' ? tripMessages.detailCompleteTrip : tripMessages.applyCancelConfirm;
  const confirmOkText =
    confirmAction === 'complete' ? tripMessages.detailCompleteTrip : tripMessages.applyCancel;
  const confirmBusy = confirmAction === 'complete' ? completing : cancelling;
  const confirmHint =
    confirmAction === 'complete'
      ? tripMessages.detailCompleteHint
      : '撤回后可以再次申请，但需要发布者重新处理。';

  const submitApplication = async () => {
    if (submitting) {
      return;
    }
    if (!studentGate.allowed) {
      studentGate.requireVerified(() => undefined);
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await applyForTrip(
        currentUser.id,
        tripId,
        applyMessage.trim() === '' ? null : applyMessage.trim(),
      );
      setMyApplication(created);
      setApplyMessage('');
      reload();
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      let currentTrip = trip;
      try {
        currentTrip = await loadTrip(currentUser.id, tripId);
      } catch {
        // 刷新失败时保留旧快照，原因退化为「当前不可申请」。
      }
      const mapped = applicationErrorMessage(code, currentTrip);
      if (mapped === null) {
        showActionError(error);
      } else {
        setFeedback({
          tone: code === 'DUPLICATE_APPLICATION' ? 'warning' : 'error',
          title: mapped,
        });
      }
      await refreshMyApplication().catch(() => undefined);
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  const runConfirm = async () => {
    if (confirmAction === 'complete') {
      await complete();
    } else if (confirmAction === 'cancelApply') {
      await cancelMyApplication();
    }
    setConfirmAction(null);
  };

  return (
    <main className="form-page">
      {studentGate.prompt}
      <div className="detail-stack">
        <a
          href="#/"
          className="detail-back-btn"
          aria-label={tripMessages.backHome}
          title={tripMessages.backHome}
        >
          <ShareIcon name="left" />
        </a>

        <Card className="panel detail-card">
          <header className="detail-head">
            <div className="detail-badges">
              <Tag color={statusColor(trip.status)}>{statusLabel(trip.status)}</Tag>
              <Tag>{destinationTagText(trip)}</Tag>
              {trip.ai_itinerary_id != null && (
                <Tag className="ai-source-badge" data-testid="ai-source-badge">
                  {aiMessages.sourceBadge}
                </Tag>
              )}
              {!isPublisher && (
                <Button
                  type="link"
                  danger
                  className="head-report"
                  onClick={() => setReportOpen(true)}
                >
                  {tripMessages.reportEntryTrip}
                </Button>
              )}
            </div>
            <Typography.Title level={2} className="trip-title detail-title">
              {trip.title}
            </Typography.Title>
            <p className="detail-meta">
              <span>{trip.start_date} → {trip.end_date}</span>
              <span>
                {tripMessages.joinedLabel} {trip.joined_count}/{trip.capacity}
                {tripMessages.peopleUnit}
              </span>
            </p>
          </header>

          <section className="detail-section weather-section">
            <WeatherCard destinationCode={trip.destination_code} date={trip.start_date} />
          </section>

          {trip.ending_soon && (isPublisher || participant) && (
            <Alert type="warning" showIcon title={tripMessages.detailEndingSoon} />
          )}

          {restricted && <CreditRestrictedNotice />}

          {aiSummary !== null && (
            <section className="detail-section ai-summary" data-testid="ai-summary">
              <h3 className="section-title">{aiMessages.aiSummaryTitle}</h3>
              <dl className="detail-facts">
                {aiSummary.weather !== null && aiSummary.weather.weather !== null && (
                  <div>
                    <dt>{aiMessages.weatherTitle}</dt>
                    <dd>
                      {aiSummary.weather.weather.weather_text} {aiSummary.weather.weather.temp_min_c}–
                      {aiSummary.weather.weather.temp_max_c}°C，{aiMessages.precipitationProbability}{' '}
                      {aiSummary.weather.weather.precipitation_probability_pct ?? '—'}%
                    </dd>
                  </div>
                )}
                {aiSummary.ai_budget !== null && (
                  <div>
                    <dt>{aiMessages.budgetTotal}</dt>
                    <dd>
                      {centsToYuan(sumBudgetCents(aiSummary.ai_budget))} 元{' '}
                      <Tag className="ai-estimate-tag">{aiMessages.budgetReference}</Tag>
                    </dd>
                  </div>
                )}
              </dl>
              {aiSummary.tips.length > 0 && (
                <ul className="ai-summary-tips">
                  {aiSummary.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {isCancelled && (
            <Alert
              type="warning"
              showIcon
              title={tripMessages.detailCancelled}
              description={
                trip.cancel_reason
                  ? `${tripMessages.detailCancelReason}：${cancelReasonLabel(trip.cancel_reason)}${
                      trip.cancel_note ? ` · ${trip.cancel_note}` : ''
                    }`
                  : undefined
              }
            />
          )}

          <section className="detail-section">
            <h3 className="section-title">
              {tripMessages.detailStops}
              {hasStops && (
                <span className="section-count">{`共 ${trip.stops.length} 站`}</span>
              )}
            </h3>
            {hasStops && (
              <div className="detail-map-section" ref={mapSectionRef}>
                <AmapTripMap
                  city={cityForSearch}
                  stops={trip.stops}
                  mode={mapTravelMode}
                  focusStop={focusStop}
                  onFocusStop={setFocusStop}
                  onRouteChange={setTripRoute}
                />
                <ol className="route-strip" aria-label={tripMessages.detailStops}>
                  {trip.stops.map((stop, index) => {
                    const isFirst = index === 0;
                    const isLast = index === trip.stops.length - 1;
                    // 首站写集合时间，其余写上一段的高德距离/时间；取不到就不渲染副行。
                    const meta = isFirst
                      ? firstStopMeta(trip.meeting_time)
                      : legMeta(tripRoute?.legs[index - 1], mapModeLabel);
                    return (
                      <li
                        key={`${stop}-${index}`}
                        className={
                          focusStop === stop ? 'route-strip-item is-active' : 'route-strip-item'
                        }
                      >
                        <button
                          type="button"
                          className="route-strip-card"
                          onClick={() => focusPlace(stop)}
                        >
                          <span className={`route-strip-index tone-${index % 4}`}>
                            {index + 1}
                          </span>
                          <span className="route-strip-body">
                            <span className="route-strip-name">{stop}</span>
                            {meta !== '' && <span className="route-strip-meta">{meta}</span>}
                          </span>
                          <span className="route-strip-role">
                            {isFirst ? '起' : isLast ? '终' : '途经'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
            {!hasStops && <p className="form-hint">{tripMessages.detailMapNoStops}</p>}
            <dl className="detail-facts">
              <div>
                <dt>{tripMessages.detailMeetingArea}</dt>
                <dd>{meetingAreaText(trip.meeting_areas)}</dd>
              </div>
              <div>
                <dt>{tripMessages.detailMeetingTime}</dt>
                <dd>{meetingTimeText(trip.meeting_time)}</dd>
              </div>
              {trip.travel_mode !== null && (
                <div>
                  <dt>{tripMessages.detailTravelMode}</dt>
                  <dd>{TRIP_TRAVEL_MODE_LABELS[trip.travel_mode]}</dd>
                </div>
              )}
              {budget !== null && (
                <div>
                  <dt>{tripMessages.detailBudget}</dt>
                  <dd>{budget}</dd>
                </div>
              )}
              {trip.note !== null && (
                <div>
                  <dt>{tripMessages.detailNote}</dt>
                  <dd>{trip.note}</dd>
                </div>
              )}
            </dl>
            {isMeetingIncomplete(trip) && (
              <p className="detail-meta">{tripMessages.meetingEmptyHint}</p>
            )}
            {isPublisher && !isCompleted && !isCancelled && (
              <div className="detail-actions">
                <Button
                  size="small"
                  disabled={restricted}
                  onClick={() => openMeeting(trip.meeting_areas ?? [], trip.meeting_time ?? null)}
                >
                  {tripMessages.meetingEdit}
                </Button>
                {(trip.status === 'recruiting' || trip.status === 'full') && (
                  <Button
                    size="small"
                    data-testid="trip-route-edit"
                    disabled={restricted}
                    onClick={() => setRouteOpen(true)}
                  >
                    {tripMessages.routeEdit}
                  </Button>
                )}
              </div>
            )}
            {(isPublisher || participant) && trip.group_open === true && (
              <div className="detail-actions">
                <Button
                  type="primary"
                  size="small"
                  data-testid="trip-group-entry"
                  onClick={() => (window.location.hash = `#/chat/${trip.id}/group`)}
                >
                  {tripMessages.enterGroupChat}
                </Button>
              </div>
            )}
          </section>

          {financeEntryVisible(trip, currentUser.id) && (
            <section className="detail-section fin-entry">
              <h3 className="section-title">{financeMessages.tripSectionTitle}</h3>
              <p className="detail-meta" data-testid="trip-insurance-status">
                {financeMessages.insuranceStatusLabel}：
                {insuranceStatusLabel(insurance?.status ?? 'not_purchased')}
              </p>
              {insurance?.policy ? (
                <p className="detail-meta" data-testid="trip-insurance-period">
                  {financeMessages.insurancePeriodLabel}：
                  {financeMessages.insurancePeriod(
                    insurance.policy.coverage_start,
                    insurance.policy.coverage_end,
                  )}
                </p>
              ) : (
                <p className="detail-meta">{financeMessages.insuranceEntryHint}</p>
              )}
              <div className="detail-actions">
                <Button
                  type="primary"
                  onClick={() => (window.location.hash = `#/trips/${trip.id}/finance`)}
                >
                  {insurance?.policy
                    ? financeMessages.insuranceEntryDetail
                    : financeMessages.insuranceEntryOpen}
                </Button>
                {insurance?.policy && (
                  <Button
                    onClick={() =>
                      window.open(insurance.provider.emergency_url, '_blank', 'noopener,noreferrer')
                    }
                  >
                    {financeMessages.insuranceEntryEmergency}
                  </Button>
                )}
              </div>
              {insurance && (
                <p className="detail-meta">
                  {financeMessages.insuranceProviderDisclaimer(insurance.provider.name)}
                </p>
              )}
            </section>
          )}

          <section className="detail-section">
            <h3 className="section-title">{tripMessages.detailPublisher}</h3>
            <button
              type="button"
              className="publisher-row publisher-button"
              aria-label={`查看 ${trip.publisher.nickname} 的资料`}
              onClick={() => openProfile(trip.publisher.id)}
            >
              <Avatar user={trip.publisher} size="lg" />
              <span className="publisher-body">
                <span className="publisher-name">
                  {trip.publisher.nickname}
                  {publisherSummary(trip.publisher) !== '' && ` · ${publisherSummary(trip.publisher)}`}
                </span>
                {growth[trip.publisher.id] !== undefined && (
                  <GrowthBadge level={growth[trip.publisher.id].level} />
                )}
                {trip.publisher.bio !== '' && (
                  <span className="publisher-bio">{trip.publisher.bio}</span>
                )}
                {trip.publisher.interests.length > 0 && (
                  <span className="publisher-tags">
                    {trip.publisher.interests.map((interest) => (
                      <span key={interest} className="tag">
                        {interest}
                      </span>
                    ))}
                  </span>
                )}
                {publisherCredits[trip.publisher.id] !== undefined && (
                  <span
                    className={`profile-credit is-compact publisher-credit ${creditTone(
                      publisherCredits[trip.publisher.id].credit_level,
                    )}`}
                  >
                    {creditLine(
                      publisherCredits[trip.publisher.id].credit_score,
                      publisherCredits[trip.publisher.id].credit_level,
                    )}
                    {publisherCredits[trip.publisher.id].credit_restricted && (
                      <span className="badge danger credit-restricted-badge">
                        {creditRestrictedBadge(publisherCredits[trip.publisher.id].credit_restricted)}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </button>
          </section>

          <section className="detail-section">
            <h3 className="section-title">{tripMessages.detailParticipants}</h3>
            {companions.length === 0 ? (
              <p className="detail-companions-empty">{tripMessages.detailParticipantsEmpty}</p>
            ) : (
              <ul className="detail-companions">
                {companions.map((member) => (
                  <CompanionCard
                    key={member.id}
                    member={member}
                    growth={growth[member.id]}
                    canChat={
                      member.id !== currentUser.id && (isPublisher || entry.kind === 'accepted')
                    }
                    chatHref={`#/chat/${trip.id}/${member.id}`}
                    onOpenProfile={openProfile}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="detail-section">
            <h3 className="section-title">{tripMessages.experienceSectionTitle}</h3>
            {experiences !== null && experiences.length === 0 && (
              <Typography.Text type="secondary">{tripMessages.experienceSectionEmpty}</Typography.Text>
            )}
            {experiences !== null && experiences.length > 0 && (
              <ul className="experience-list">
                {experiences.map((experience) => (
                  <li key={experience.id}>
                    <div className="experience-list-head">
                      <Tag>{experience.author.avatar_initial}</Tag>
                      <strong>{experience.author.nickname}</strong>
                      <span className="badge amber">
                        {tripMessages.experienceIntensityLabel} · {intensityLabel(experience.intensity)}
                      </span>
                    </div>
                    <p className="experience-full">{experience.content}</p>
                    <p className="experience-advice-line">
                      <b>{tripMessages.experienceAdviceLabel}：</b>
                      {experience.advice}
                    </p>
                    {experience.photos.length > 0 && (
                      <div className="experience-photos">
                        <Image.PreviewGroup
                          items={experience.photos.map((photo) => photo.url)}
                        >
                          {experience.photos.map((photo, index) => (
                            <Image
                              key={photo.id}
                              src={photo.url}
                              alt={`${tripMessages.experiencePhotoAlt} ${index + 1}`}
                            />
                          ))}
                        </Image.PreviewGroup>
                      </div>
                    )}
                    <div className="exp-item-foot">
                      <ExperienceLikeButton
                        experience={experience}
                        currentUserId={currentUser.id}
                        onChange={updateExperience}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {(canShare || isCompleted) && (
              <div className="detail-actions">
                {canShare && (
                  <Button
                    disabled={restricted}
                    onClick={() => (window.location.hash = `#/share/${trip.id}`)}
                  >
                    {hasShared ? tripMessages.experienceEditEntry : tripMessages.experienceShareEntry}
                  </Button>
                )}
                {isCompleted && (
                  <Button onClick={() => (window.location.hash = `#/trips/new?from=${trip.id}`)}>
                    {tripMessages.referencePublish}
                  </Button>
                )}
              </div>
            )}
          </section>

          {feedback !== null && (
            <Alert
              type={feedback.tone}
              showIcon
              title={feedback.title}
              description={feedback.detail}
            />
          )}

          {entry.kind !== 'publisher' && (
            <section className="detail-section detail-application">
              <h3 className="section-title">{tripMessages.applyAreaTitle}</h3>
              <div className="action-box">
                {entry.kind === 'pending' && (
                  <>
                    <p className="action-note warn">
                      {`申请已提交，等待 ${trip.publisher.nickname} 回应。处理前你可以随时撤回。`}
                    </p>
                    <Button
                      block
                      loading={cancelling}
                      onClick={() => setConfirmAction('cancelApply')}
                    >
                      {tripMessages.applyCancel}
                    </Button>
                  </>
                )}

                {entry.kind === 'accepted' && (
                  <>
                    <p className="action-note">{tripMessages.applyAcceptedNote}</p>
                    <Button
                      block
                      onClick={() => (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)}
                    >
                      {`与 ${trip.publisher.nickname} 沟通`}
                    </Button>
                    {!isCompleted && !isCancelled && (
                      <Button block danger onClick={() => setLeaveOpen(true)}>
                        {tripMessages.leaveTrip}
                      </Button>
                    )}
                  </>
                )}

                {entry.kind === 'cancelled' && (
                  <>
                    <p className="action-note">
                      {`${tripMessages.applyCancelledTrip}，历史聊天仍可查看。`}
                    </p>
                    <Button
                      block
                      onClick={() => (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)}
                    >
                      {tripMessages.chatEntry}
                    </Button>
                  </>
                )}
                {myApplication?.status === 'left' && (
                  <>
                    <p className="action-note">{tripMessages.leaveRetainedNote}</p>
                    <Button
                      block
                      onClick={() => (window.location.hash = `#/chat/${trip.id}/${trip.publisher.id}`)}
                    >
                      {tripMessages.chatEntry}
                    </Button>
                  </>
                )}

                {entry.kind === 'unavailable' && <p className="action-note warn">{entry.reason}</p>}

                {entry.kind === 'apply' && (
                  <div className="apply-form">
                    <label className="field">
                      <span className="label">
                        {tripMessages.applyMessageLabel}
                        <span className="opt">{tripMessages.applyMessageOptional}</span>
                      </span>
                      <Input.TextArea
                        className="textarea"
                        value={applyMessage}
                        maxLength={MAX_MESSAGE_LENGTH}
                        rows={3}
                        placeholder={tripMessages.applyMessagePlaceholder}
                        onChange={(event) => setApplyMessage(event.target.value)}
                      />
                    </label>
                    <Button
                      type="primary"
                      block
                      loading={submitting}
                      disabled={restricted}
                      onClick={submitApplication}
                    >
                      {tripMessages.applySubmit}
                    </Button>
                    <p className="hint">{tripMessages.applyChatHint}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {isPublisher && (
            <div className="detail-actions detail-actions-primary">
              {trip.status === 'ongoing' && (
                <Button
                  loading={completing}
                  disabled={restricted}
                  onClick={() => {
                    setCompleteChecked(allChecked(trip.stops));
                    setConfirmAction('complete');
                  }}
                >
                  {tripMessages.detailCompleteTrip}
                </Button>
              )}
              {!isCancelled && trip.status !== 'completed' && (
                <Button onClick={() => (window.location.hash = `#/trips/${trip.id}/applications`)}>
                  {tripMessages.applicationsEntry}
                  {pendingCount > 0 ? `（${pendingCount}）` : ''}
                </Button>
              )}
              {(trip.status === 'recruiting' || trip.status === 'full') && (
                <Button danger disabled={restricted} onClick={() => setCancelOpen(true)}>
                  {tripMessages.detailCancelTrip}
                </Button>
              )}
              <span className="badge dusk">{tripMessages.applyEntryOwn}</span>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={confirmAction !== null}
        title={confirmTitle}
        okText={confirmOkText}
        cancelText={tripMessages.createCancel}
        confirmLoading={confirmBusy}
        okButtonProps={{ danger: confirmAction !== 'complete' }}
        onOk={runConfirm}
        onCancel={() => setConfirmAction(null)}
      >
        <Typography.Paragraph>{confirmHint}</Typography.Paragraph>
        {confirmAction === 'complete' && (
          <StopCompletionPicker
            stops={trip.stops}
            checked={completeChecked}
            onChange={setCompleteChecked}
          />
        )}
      </Modal>
      <Modal
        open={meetingOpen}
        title={tripMessages.meetingEditTitle}
        okText={tripMessages.meetingSave}
        cancelText={tripMessages.meetingCancel}
        confirmLoading={meetingSaving}
        onOk={() => submitMeeting(trip.end_date)}
        onCancel={() => setMeetingOpen(false)}
      >
        <Space orientation="vertical" size="small" className="home-stack">
          <Typography.Text type="secondary">{tripMessages.meetingEditHint}</Typography.Text>
          <div className="form-field">
            <label htmlFor="meeting-area">{tripMessages.meetingAreaLabel}</label>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                id="meeting-area"
                value={meetingDraft}
                maxLength={MAX_MEETING_AREA_LENGTH + 10}
                placeholder="手输集合地点，回车添加"
                onChange={(event) => {
                  setMeetingDraft(event.target.value);
                  setMeetingDraftError(null);
                }}
                onPressEnter={() => {
                  const result = addMeetingArea(meetingForm.meetingAreas, meetingDraft);
                  if (result.error !== null) {
                    setMeetingDraftError(result.error);
                    return;
                  }
                  setMeetingForm((current) => ({ ...current, meetingAreas: result.next }));
                  setMeetingDraft('');
                }}
              />
              <Button
                disabled={meetingDraft.trim() === ''}
                onClick={() => {
                  const result = addMeetingArea(meetingForm.meetingAreas, meetingDraft);
                  if (result.error !== null) {
                    setMeetingDraftError(result.error);
                    return;
                  }
                  setMeetingForm((current) => ({ ...current, meetingAreas: result.next }));
                  setMeetingDraft('');
                }}
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
              value={meetingForm.meetingAreas}
              onChange={(next) => setMeetingForm((current) => ({ ...current, meetingAreas: next }))}
              placeholder="搜索集合地点"
              showMap={false}
              city={cityForSearch}
            />
            {meetingErrors.meetingArea !== undefined && (
              <Typography.Text type="danger">{meetingErrors.meetingArea}</Typography.Text>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="meeting-time">{tripMessages.meetingTimeLabel}</label>
            <DatePicker
              {...appDateTimePickerProps}
              id="meeting-time"
              className="meeting-time"
              placeholder="选择日期与时间"
              value={localDateTimeToDayjs(meetingForm.meetingTime)}
              onChange={(value) =>
                setMeetingForm((current) => ({
                  ...current,
                  meetingTime: dayjsToLocalDateTime(value),
                }))
              }
              status={meetingErrors.meetingTime === undefined ? undefined : 'error'}
            />
            {meetingErrors.meetingTime !== undefined && (
              <Typography.Text type="danger">{meetingErrors.meetingTime}</Typography.Text>
            )}
          </div>
        </Space>
      </Modal>


      <TripCancelModal
        open={cancelOpen}
        userId={currentUser.id}
        trip={trip}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => {
          reload();
        }}
      />

      <TripRouteModal
        open={routeOpen}
        userId={currentUser.id}
        trip={trip}
        onClose={() => setRouteOpen(false)}
        onSaved={() => {
          reload();
        }}
      />

      <TripLeaveModal
        open={leaveOpen}
        userId={currentUser.id}
        tripId={trip.id}
        title={trip.title}
        onClose={() => setLeaveOpen(false)}
        onLeft={(result) => {
          setMyApplication((current) => (current === null ? null : { ...current, status: 'left' }));
          setFeedback({ tone: 'warning', title: leaveResultText(result) });
          refreshCredit();
          reload();
        }}
      />

      <ReportModal
        userId={currentUser.id}
        open={reportOpen}
        targetType="trip"
        targetId={tripId}
        targetLabel={trip.title}
        onClose={() => setReportOpen(false)}
      />
    </main>
  );
}