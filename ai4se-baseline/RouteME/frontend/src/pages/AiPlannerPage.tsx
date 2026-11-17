/**
 * AI 智能规划页（add-ai-itinerary T7，design §4.1）：左条件表单 / 中高德地图 /
 * 右天气·Tips·预算·时间轴。取数与状态机在本页，纯逻辑全部在 ai/* 模块。
 *
 * 关键口径：
 * - 坐标 / 路线 / 距离 / 时间只来自高德，天气只来自 Open-Meteo，预算恒标「AI 估算」；
 * - 路线重算由事件驱动（生成完成 / 删除 / 更换 / 调序 / 重试），不走 effect——
 *   StrictMode 下 effect 双调用会破坏「每次编辑恰好重算一次」的口径；
 * - 天气预览（目的地 + 日期）与 generate 响应的权威天气用 token 守卫切换（L-02）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  InputNumber,
  Segmented,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ApiError, fetchWeatherForecast, generateAiItinerary, saveAiItinerary } from '../api';
import { aiErrorMessage, aiMessages } from '../ai/aiMessages';
import { centsToYuan, overBudgetCents, sumBudgetCents } from '../ai/budgetMath';
import { moveStop, removeStop, replaceStop, resolvedCount } from '../ai/itineraryEdit';
import { resolveStops, type ResolvedStop } from '../ai/poiResolve';
import {
  canGenerate,
  defaultPlannerForm,
  toGenerateRequest,
  yuanToCents,
  type PlannerFormValues,
} from '../ai/plannerForm';
import { buildSnapshot } from '../ai/snapshot';
import { AmapContainer } from '../map/amap/AmapContainer';
import { PlaceSearchBox } from '../map/amap/PlaceSearchBox';
import { RouteLayer } from '../map/amap/RouteLayer';
import {
  amapErrorMessage,
  aroundPlaces,
  formatDistance,
  formatDuration,
  planRoute,
  reverseGeocode,
} from '../map/amap/AmapService';
import type { AmapMap, LngLat } from '../map/amap/types';
import type {
  AiBudget,
  AiDuration,
  AiPace,
  AiPlanStop,
  AiTravelMode,
  DemoUser,
  PlaceResult,
  RoutePlan,
  RouteWaypoint,
  WeatherForecast,
} from '../types';
import { appDatePickerProps } from '../utils/datePickerProps';
import { dayjsToIso, isoToDayjs } from '../utils/dates';

// 与发布页一致：日期弹层月份名保持中文。
dayjs.locale('zh-cn');

type Props = {
  currentUser: DemoUser;
};

/** 时间轴按天分组：day 随景点对象在编辑（ spread / swap ）中保留。 */
type DayStop = ResolvedStop & { day: number };

type PlanMeta = {
  title: string;
  tips: string[];
  packing: string[];
  budget: AiBudget;
  dayCount: number;
};

type PlaceSlot = 'origin' | 'destination';

const DEFAULT_CENTER = { lng: 113.264, lat: 23.129 };
const INTEREST_OPTIONS = ['美食', '摄影', 'City Walk', '自然', '历史', '购物', '艺术'];

function isResolved<T extends ResolvedStop>(stop: T): stop is T & { lng: number; lat: number } {
  return stop.resolved && stop.lng !== undefined && stop.lat !== undefined;
}

function toWaypoint(stop: ResolvedStop & { lng: number; lat: number }): RouteWaypoint {
  return { id: `stop-${stop.order}`, name: stop.name, lng: stop.lng, lat: stop.lat };
}

export function AiPlannerPage({ currentUser }: Props) {
  const [form, setForm] = useState<PlannerFormValues>(() => defaultPlannerForm());
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [planMeta, setPlanMeta] = useState<PlanMeta | null>(null);
  const [stops, setStops] = useState<DayStop[]>([]);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [pickTarget, setPickTarget] = useState<PlaceSlot>('origin');
  const [candidates, setCandidates] = useState<PlaceResult[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [map, setMap] = useState<AmapMap | null>(null);

  const routeTokenRef = useRef(0);
  const weatherTokenRef = useRef(0);

  const update = (patch: Partial<PlannerFormValues>) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  /* ---------- 地点：搜索 / 定位 / 地图点击（AC1 / AC2） ---------- */

  const pickPlace = (slot: PlaceSlot) => (place: PlaceResult) => {
    update({ [slot]: { name: place.name, lng: place.lng, lat: place.lat } });
  };

  const onMapClick = (point: LngLat) => {
    if (!pickMode) {
      return;
    }
    setCandidatesLoading(true);
    setCandidates([]);
    // 点击点本身永远可选（坐标精确等于点击位置），附近 POI 只是额外候选；
    // 高德不可用时附近搜索返回空，选点仍然可用。
    Promise.all([
      reverseGeocode(point[0], point[1]).catch(() => null),
      aroundPlaces(point[0], point[1], 500).catch(() => [] as PlaceResult[]),
    ])
      .then(([exact, nearby]) => {
        const list: PlaceResult[] = exact === null ? [] : [exact];
        for (const place of nearby) {
          if (!list.some((item) => item.id === place.id)) {
            list.push(place);
          }
        }
        setCandidates(list);
      })
      .finally(() => setCandidatesLoading(false));
  };

  const pickCandidate = (place: PlaceResult) => {
    pickPlace(pickTarget)(place);
    setCandidates(null);
  };

  /* ---------- 天气：预览（目的地 + 日期）→ generate 权威切换（L-02） ---------- */

  const loadWeatherPreview = useCallback(() => {
    const destination = form.destination;
    if (destination === null || form.date === '') {
      return;
    }
    const token = weatherTokenRef.current;
    setWeatherLoading(true);
    setWeatherError(false);
    // 目的地为地图自由选点（无区划码）：传空 code + 坐标，后端按坐标取 Open-Meteo。
    fetchWeatherForecast('', form.date, { lng: destination.lng, lat: destination.lat })
      .then((forecast) => {
        if (token === weatherTokenRef.current) {
          setWeather(forecast);
          setWeatherLoading(false);
        }
      })
      .catch(() => {
        if (token === weatherTokenRef.current) {
          setWeather(null);
          setWeatherError(true);
          setWeatherLoading(false);
        }
      });
  }, [form.destination, form.date]);

  useEffect(() => {
    loadWeatherPreview();
  }, [loadWeatherPreview]);

  /* ---------- 路线：事件驱动重算（AC15），token 丢弃过期响应 ---------- */

  const recalcRoute = useCallback(
    async (nextStops: ResolvedStop[]) => {
      const token = ++routeTokenRef.current;
      const resolved = nextStops.filter(isResolved);
      setRoute(null);
      setRouteError(null);
      if (resolved.length < 2) {
        setRouteLoading(false);
        return;
      }
      setRouteLoading(true);
      try {
        // transit 需要城市名限定换乘范围：优先用高德解析出的城市，而非 POI 级目的地名。
        const city = resolved.find((stop) => stop.city)?.city ?? form.destination?.name;
        const plan = await planRoute(form.travelMode, resolved.map(toWaypoint), city);
        if (token === routeTokenRef.current) {
          setRoute(plan);
          setRouteLoading(false);
        }
      } catch (error: unknown) {
        if (token === routeTokenRef.current) {
          setRoute(null);
          setRouteError(amapErrorMessage(error));
          setRouteLoading(false);
        }
      }
    },
    [form.travelMode, form.destination],
  );

  /* ---------- 生成 / 重新生成 / 降预算（AC5 / AC16 / E27） ---------- */

  const generate = async (reduceBudget: boolean) => {
    if (!canGenerate(form) || generating) {
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    setSaveError(null);
    try {
      const response = await generateAiItinerary(
        currentUser.id,
        toGenerateRequest(form, reduceBudget),
      );
      const plan = response.plan;
      const flat: AiPlanStop[] = [];
      const dayOf: number[] = [];
      for (const day of plan.days) {
        for (const stop of day.stops) {
          flat.push(stop);
          dayOf.push(day.day);
        }
      }
      // POI 坐标逐个经高德解析；失败标「未定位」，不伪造坐标（AC6）。
      const resolved = await resolveStops(flat, form.destination?.name);
      const nextStops: DayStop[] = resolved.map((stop, index) => ({
        ...stop,
        day: dayOf[index] ?? 1,
      }));
      setPlanMeta({
        title: plan.title,
        tips: plan.tips,
        packing: plan.packing,
        budget: plan.budget,
        dayCount: plan.days.length,
      });
      setStops(nextStops);
      weatherTokenRef.current += 1;
      setWeather(response.weather);
      setWeatherError(false);
      setWeatherLoading(false);
      setReplaceIndex(null);
      setFocusId(null);
      void recalcRoute(nextStops);
    } catch (error: unknown) {
      setGenerateError(error instanceof ApiError ? error.code : 'UNKNOWN_ERROR');
    } finally {
      setGenerating(false);
    }
  };

  /* ---------- 编辑：删除 / 更换 / 上移 / 下移，每次恰好重算一次 ---------- */

  const applyStops = (next: ResolvedStop[]) => {
    // itineraryEdit 的 spread / swap 保留对象上的 day 字段，这里只补类型口径。
    const dayStops = next as DayStop[];
    setStops(dayStops);
    setReplaceIndex(null);
    void recalcRoute(dayStops);
  };

  const onReplacePick = (index: number) => (place: PlaceResult) => {
    const target = stops[index];
    if (target === undefined) {
      return;
    }
    const replacement: DayStop = {
      name: place.name,
      reason: aiMessages.manualReplaceReason,
      arrival: target.arrival,
      stay_minutes: target.stay_minutes,
      indoor: false,
      order: target.order,
      resolved: true,
      lng: place.lng,
      lat: place.lat,
      day: target.day,
    };
    applyStops(replaceStop(stops, index, replacement));
  };

  /* ---------- 保存闭环（AC17 / L-01） ---------- */

  const save = async () => {
    if (planMeta === null || resolvedCount(stops) < 2 || saving || generating) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const snapshot = buildSnapshot({
        form,
        stops,
        route,
        weather,
        tips: planMeta.tips,
        packing: planMeta.packing,
        aiBudget: planMeta.budget,
      });
      const saved = await saveAiItinerary(currentUser.id, snapshot);
      window.location.hash = `#/trips/new?ai=${saved.id}`;
    } catch {
      setSaveError(aiMessages.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 派生数据 ---------- */

  const resolvedStops = useMemo(() => stops.filter(isResolved), [stops]);
  const waypoints = useMemo(() => resolvedStops.map(toWaypoint), [resolvedStops]);
  const numbers = useMemo(() => resolvedStops.map((stop) => stop.order), [resolvedStops]);
  const center = form.destination ?? form.origin ?? DEFAULT_CENTER;
  const userBudgetCents = yuanToCents(form.budgetYuan);
  const overBudget =
    planMeta === null ? null : overBudgetCents(planMeta.budget, userBudgetCents);
  const totalStaySeconds = stops.reduce((sum, stop) => sum + stop.stay_minutes, 0) * 60;
  const canSave = planMeta !== null && resolvedCount(stops) >= 2 && !saving && !generating;

  return (
    <main className="ai-planner-page">
      <div className="page-head">
        <div>
          <Typography.Title level={2} className="page-title">
            {aiMessages.pageTitle}
          </Typography.Title>
          <p className="page-sub">{aiMessages.pageSubtitle}</p>
        </div>
        <Button className="page-back" onClick={() => (window.location.hash = '#/')}>
          {aiMessages.backHome}
        </Button>
      </div>

      <div className="ai-planner-grid">
        <aside className="ai-form">
          <Card className="panel ai-form-card">
            <div className="form-stack">
              <div className="form-field ai-place-field" data-testid="ai-origin-field">
                <label className="form-label" htmlFor="ai-origin-input">
                  <span>{aiMessages.originLabel}</span>
                  <span className="req" aria-hidden="true">*</span>
                </label>
                <PlaceSearchBox
                  inputId="ai-origin-input"
                  ariaLabel={aiMessages.originLabel}
                  placeholder={aiMessages.placeSearchPlaceholder}
                  onPick={pickPlace('origin')}
                />
                {form.origin !== null && (
                  <div className="ai-selected-place">
                    <span className="ai-place-chip" data-testid="ai-origin-name">
                      {form.origin.name}
                    </span>
                    <span className="ai-place-coords">
                      {form.origin.lng.toFixed(4)}, {form.origin.lat.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-field ai-place-field" data-testid="ai-destination-field">
                <label className="form-label" htmlFor="ai-destination-input">
                  <span>{aiMessages.destinationLabel}</span>
                  <span className="req" aria-hidden="true">*</span>
                </label>
                <PlaceSearchBox
                  inputId="ai-destination-input"
                  ariaLabel={aiMessages.destinationLabel}
                  placeholder={aiMessages.placeSearchPlaceholder}
                  onPick={pickPlace('destination')}
                />
                {form.destination !== null && (
                  <div className="ai-selected-place">
                    <span className="ai-place-chip" data-testid="ai-destination-name">
                      {form.destination.name}
                    </span>
                    <span className="ai-place-coords">
                      {form.destination.lng.toFixed(4)}, {form.destination.lat.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-field">
                <Button
                  data-testid="ai-map-pick"
                  aria-pressed={pickMode}
                  type={pickMode ? 'primary' : 'default'}
                  ghost={pickMode}
                  onClick={() => {
                    setPickMode((previous) => !previous);
                    setCandidates(null);
                  }}
                >
                  {aiMessages.mapPick}
                </Button>
                {pickMode && (
                  <div className="ai-pick-panel">
                    <span className="form-label">{aiMessages.mapPickTarget}</span>
                    <div data-testid="ai-map-pick-target">
                      <Segmented
                        block
                        options={[aiMessages.originLabel, aiMessages.destinationLabel]}
                        value={
                          pickTarget === 'origin'
                            ? aiMessages.originLabel
                            : aiMessages.destinationLabel
                        }
                        onChange={(value) =>
                          setPickTarget(
                            value === aiMessages.originLabel ? 'origin' : 'destination',
                          )
                        }
                      />
                    </div>
                    <span className="form-hint">{aiMessages.mapPickHint}</span>
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="ai-date-input">
                  <span>{aiMessages.dateLabel}</span>
                  <span className="req" aria-hidden="true">*</span>
                </label>
                <div className="trip-date-anchor" data-testid="ai-date">
                  <DatePicker
                    {...appDatePickerProps}
                    id="ai-date-input"
                    className="trip-date"
                    format="YYYY-MM-DD"
                    placeholder="选择日期"
                    locale={zhCN.DatePicker}
                    needConfirm
                    allowClear={false}
                    minDate={dayjs()}
                    maxDate={dayjs().add(16, 'day')}
                    value={isoToDayjs(form.date)}
                    onChange={(value) => update({ date: dayjsToIso(value) })}
                  />
                </div>
              </div>

              <div className="form-field">
                <span className="form-label">{aiMessages.durationLabel}</span>
                <div data-testid="ai-duration">
                  <Segmented
                    block
                    options={Object.entries(aiMessages.durationOptions).map(([value, label]) => ({
                      label,
                      value,
                    }))}
                    value={form.duration}
                    onChange={(value) => update({ duration: value as AiDuration })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="ai-budget-input">
                  <span>{aiMessages.budgetLabel}</span>
                  <span className="opt">选填</span>
                </label>
                <div data-testid="ai-budget">
                  <InputNumber
                    id="ai-budget-input"
                    min={0}
                    precision={0}
                    style={{ width: '100%' }}
                    placeholder="如 500"
                    value={form.budgetYuan === '' ? null : Number(form.budgetYuan)}
                    onChange={(value) => update({ budgetYuan: value === null ? '' : String(value) })}
                  />
                </div>
              </div>

              <div className="form-field">
                <span className="form-label">{aiMessages.modeLabel}</span>
                <div data-testid="ai-mode">
                  <Select
                    aria-label={aiMessages.modeLabel}
                    style={{ width: '100%' }}
                    options={Object.entries(aiMessages.modeOptions).map(([value, label]) => ({
                      label,
                      value,
                    }))}
                    value={form.travelMode}
                    onChange={(value) => update({ travelMode: value as AiTravelMode })}
                  />
                </div>
              </div>

              <div className="form-field">
                <span className="form-label">{aiMessages.interestsLabel}</span>
                <div data-testid="ai-interests">
                  <Select
                    mode="multiple"
                    aria-label={aiMessages.interestsLabel}
                    style={{ width: '100%' }}
                    placeholder="可多选"
                    allowClear
                    options={INTEREST_OPTIONS.map((tag) => ({ label: tag, value: tag }))}
                    value={form.interests}
                    onChange={(value) => update({ interests: value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <span className="form-label">{aiMessages.paceLabel}</span>
                <div data-testid="ai-pace">
                  <Segmented
                    block
                    options={Object.entries(aiMessages.paceOptions).map(([value, label]) => ({
                      label,
                      value,
                    }))}
                    value={form.pace}
                    onChange={(value) => update({ pace: value as AiPace })}
                  />
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                block
                data-testid="ai-generate"
                disabled={!canGenerate(form) || generating}
                loading={generating}
                onClick={() => void generate(false)}
              >
                {aiMessages.generate}
              </Button>
              {!canGenerate(form) && <p className="form-hint">{aiMessages.requiredHint}</p>}
            </div>
          </Card>
        </aside>

        <section className="ai-map" aria-label={aiMessages.pageTitle}>
          <AmapContainer
            className="ai-map-container"
            lng={center.lng}
            lat={center.lat}
            zoom={11}
            ariaLabel="AI 推荐路线地图"
            onReady={setMap}
            onMapClick={onMapClick}
          >
            <RouteLayer
              map={map}
              waypoints={waypoints}
              route={route}
              focusId={focusId}
              onFocus={setFocusId}
              numbers={numbers}
            />
            {pickMode && candidates !== null && (
              <div
                className="ai-map-candidates"
                data-testid="ai-map-candidates"
                role="dialog"
                aria-label={aiMessages.mapCandidates}
              >
                <div className="ai-candidates-head">
                  <span>{aiMessages.mapCandidates}</span>
                  <button
                    type="button"
                    aria-label={aiMessages.closeCandidates}
                    onClick={() => setCandidates(null)}
                  >
                    ×
                  </button>
                </div>
                {candidatesLoading ? (
                  <div className="ai-candidates-state" role="status">
                    <Spin size="small" />
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="ai-candidates-state">{aiMessages.mapCandidatesEmpty}</p>
                ) : (
                  <ul className="ai-candidates-list">
                    {candidates.map((place) => (
                      <li key={place.id}>
                        <button type="button" onClick={() => pickCandidate(place)}>
                          <span className="ai-candidate-name">{place.name}</span>
                          <span className="ai-candidate-meta">{place.address}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </AmapContainer>
          {routeError !== null && (
            <div className="ai-error-panel" role="alert">
              <span>{routeError}</span>
              <Button
                size="small"
                data-testid="ai-route-retry"
                onClick={() => void recalcRoute(stops)}
              >
                {aiMessages.retry}
              </Button>
            </div>
          )}
        </section>

        <aside className="ai-result">
          {generating && (
            <div className="ai-loading" data-testid="ai-loading" role="status">
              <Spin />
              <div>
                <p className="ai-loading-text">{aiMessages.loading}</p>
                <p className="form-hint">{aiMessages.generatingHint}</p>
              </div>
            </div>
          )}
          {generateError !== null && !generating && (
            <div className="ai-error-panel" role="alert">
              <span>{aiErrorMessage(generateError)}</span>
              <Button
                size="small"
                data-testid="ai-error-retry"
                onClick={() => void generate(false)}
              >
                {aiMessages.retry}
              </Button>
            </div>
          )}

          <Card className="panel ai-weather-card" data-testid="ai-weather-card">
            <h3 className="panel-title">
              {aiMessages.weatherTitle}
              {weather !== null && weather.available && (
                <Tag className="ai-weather-source">{aiMessages.weatherSource}</Tag>
              )}
            </h3>
            {weatherLoading ? (
              <div className="ai-card-loading" role="status">
                <Spin size="small" />
                <span>{aiMessages.weatherLoading}</span>
              </div>
            ) : weatherError ? (
              <div className="ai-error-panel" role="alert">
                <span>{aiMessages.weatherFailed}</span>
                <Button
                  size="small"
                  data-testid="ai-weather-retry"
                  onClick={loadWeatherPreview}
                >
                  {aiMessages.retry}
                </Button>
              </div>
            ) : weather !== null && weather.available && weather.weather !== null ? (
              <>
                <div className="ai-weather-main">
                  <span className="ai-weather-temp">
                    {weather.weather.temp_min_c}–{weather.weather.temp_max_c}°C
                  </span>
                  <span className="ai-weather-text">{weather.weather.weather_text}</span>
                </div>
                <dl className="ai-weather-facts">
                  <div>
                    <dt>{aiMessages.precipitationProbability}</dt>
                    <dd>{weather.weather.precipitation_probability_pct ?? '—'}%</dd>
                  </div>
                  {weather.weather.wind_speed_kmh !== null && (
                    <div>
                      <dt>{aiMessages.windSpeed}</dt>
                      <dd>{weather.weather.wind_speed_kmh} km/h</dd>
                    </div>
                  )}
                  {weather.weather.uv_index !== null && (
                    <div>
                      <dt>{aiMessages.uvIndex}</dt>
                      <dd>{weather.weather.uv_index}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : weather !== null && !weather.available ? (
              <p className="form-hint">{aiMessages.weatherOutOfRange}</p>
            ) : (
              <p className="form-hint">{aiMessages.weatherEmpty}</p>
            )}
          </Card>

          {planMeta === null && !generating && generateError === null && (
            <Card className="panel ai-empty-card">
              <Typography.Text type="secondary">{aiMessages.emptyResult}</Typography.Text>
            </Card>
          )}

          {planMeta !== null && (
            <>
              <Card className="panel ai-tips-card">
                <h3 className="panel-title">{aiMessages.tipsTitle}</h3>
                <ul className="ai-tips-list" data-testid="ai-tips">
                  {planMeta.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
                <h4 className="ai-packing-title">{aiMessages.packingTitle}</h4>
                <div className="ai-packing-list" data-testid="ai-packing">
                  {planMeta.packing.map((item) => (
                    <Tag key={item} className="ai-packing-tag">
                      {item}
                    </Tag>
                  ))}
                </div>
              </Card>

              <Card className="panel ai-budget-card" data-testid="ai-budget-card">
                <h3 className="panel-title">
                  {aiMessages.budgetTitle}
                  <Tag className="ai-estimate-tag">{aiMessages.aiEstimate}</Tag>
                </h3>
                <dl className="ai-budget-rows">
                  <div>
                    <dt>{aiMessages.budgetTransport}</dt>
                    <dd>{centsToYuan(planMeta.budget.transport_cents)} 元</dd>
                  </div>
                  <div>
                    <dt>{aiMessages.budgetTickets}</dt>
                    <dd>{centsToYuan(planMeta.budget.tickets_cents)} 元</dd>
                  </div>
                  <div>
                    <dt>{aiMessages.budgetFood}</dt>
                    <dd>{centsToYuan(planMeta.budget.food_cents)} 元</dd>
                  </div>
                  <div>
                    <dt>{aiMessages.budgetOther}</dt>
                    <dd>{centsToYuan(planMeta.budget.other_cents)} 元</dd>
                  </div>
                  <div className="ai-budget-total">
                    <dt>{aiMessages.budgetTotal}</dt>
                    <dd>{centsToYuan(sumBudgetCents(planMeta.budget))} 元</dd>
                  </div>
                  {userBudgetCents !== null && (
                    <div className="ai-budget-user">
                      <dt>{aiMessages.budgetUser}</dt>
                      <dd>{centsToYuan(userBudgetCents)} 元</dd>
                    </div>
                  )}
                </dl>
                <p className="form-hint">{aiMessages.budgetNote}</p>
                {overBudget !== null && (
                  <div className="ai-over-budget" role="alert">
                    <span>{aiMessages.overBudget(overBudget)}</span>
                    <Button
                      size="small"
                      disabled={generating}
                      onClick={() => void generate(true)}
                    >
                      {aiMessages.reduceBudget}
                    </Button>
                  </div>
                )}
              </Card>

              <Card className="panel ai-timeline-card">
                <h3 className="panel-title">{aiMessages.timelineTitle}</h3>
                <p className="ai-plan-title">{planMeta.title}</p>
                {stops.length < 2 && (
                  <p className="ai-min-stops" role="alert">
                    {aiMessages.minStops}
                  </p>
                )}
                <ol className="ai-timeline" data-testid="ai-timeline">
                  {stops.map((stop, index) => (
                    <li
                      key={`${stop.name}-${stop.order}`}
                      data-testid="ai-stop"
                      data-name={stop.name}
                      data-indoor={stop.indoor}
                      className={[
                        'ai-stop-row',
                        stop.resolved ? '' : 'is-unresolved',
                        focusId === `stop-${stop.order}` ? 'is-active' : '',
                      ]
                        .filter((entry) => entry !== '')
                        .join(' ')}
                    >
                      {planMeta.dayCount > 1 &&
                        (index === 0 || stops[index - 1]?.day !== stop.day) && (
                          <div className="ai-day-label">{aiMessages.dayLabel(stop.day)}</div>
                        )}
                      <div className="ai-stop-line">
                        <span className="ai-stop-chip" aria-hidden="true">
                          {stop.order}
                        </span>
                        <div className="ai-stop-main">
                          <div className="ai-stop-head">
                            <span className="ai-stop-arrival">{stop.arrival}</span>
                            <button
                              type="button"
                              className="ai-stop-name"
                              onClick={() => setFocusId(`stop-${stop.order}`)}
                            >
                              {stop.name}
                            </button>
                            {stop.indoor && <Tag className="ai-indoor-tag">{aiMessages.indoorTag}</Tag>}
                            {!stop.resolved && (
                              <Tag className="ai-unresolved-tag">{aiMessages.unresolved}</Tag>
                            )}
                          </div>
                          <p className="ai-stop-reason">{stop.reason}</p>
                          <span className="ai-stop-stay">{aiMessages.stayMinutes(stop.stay_minutes)}</span>
                        </div>
                        <div className="ai-stop-actions">
                          <Button
                            size="small"
                            type="text"
                            aria-label={aiMessages.remove(stop.name)}
                            onClick={() => applyStops(removeStop(stops, index))}
                          >
                            删除
                          </Button>
                          <Button
                            size="small"
                            type="text"
                            aria-label={aiMessages.replace(stop.name)}
                            onClick={() =>
                              setReplaceIndex((previous) => (previous === index ? null : index))
                            }
                          >
                            更换
                          </Button>
                          <Button
                            size="small"
                            type="text"
                            aria-label={aiMessages.moveUp(stop.name)}
                            disabled={index === 0}
                            onClick={() => applyStops(moveStop(stops, index, -1))}
                          >
                            上移
                          </Button>
                          <Button
                            size="small"
                            type="text"
                            aria-label={aiMessages.moveDown(stop.name)}
                            disabled={index === stops.length - 1}
                            onClick={() => applyStops(moveStop(stops, index, 1))}
                          >
                            下移
                          </Button>
                        </div>
                      </div>
                      {replaceIndex === index && (
                        <div className="ai-replace-panel" data-testid="ai-replace-search">
                          <PlaceSearchBox
                            inputId={`ai-replace-input-${index}`}
                            ariaLabel={aiMessages.replace(stop.name)}
                            placeholder={aiMessages.replaceSearchPlaceholder}
                            city={form.destination?.name}
                            onPick={onReplacePick(index)}
                          />
                          <Button size="small" type="text" onClick={() => setReplaceIndex(null)}>
                            {aiMessages.replaceCancel}
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </Card>

              <div className="ai-stats" data-testid="ai-stats">
                <div className="ai-stat">
                  <span className="ai-stat-label">{aiMessages.statsDistance}</span>
                  <strong>{route === null ? '—' : formatDistance(route.distanceMeters)}</strong>
                </div>
                <div className="ai-stat">
                  <span className="ai-stat-label">{aiMessages.statsDuration}</span>
                  <strong>{route === null ? '—' : formatDuration(route.durationSeconds)}</strong>
                </div>
                <div className="ai-stat">
                  <span className="ai-stat-label">{aiMessages.statsTotal}</span>
                  <strong>
                    {route === null ? '—' : formatDuration(route.durationSeconds + totalStaySeconds)}
                  </strong>
                </div>
                <span className="ai-stats-source">
                  {routeLoading ? aiMessages.routeLoading : aiMessages.statsSource}
                </span>
                {resolvedCount(stops) < 2 && (
                  <span className="form-hint">{aiMessages.minRouteStops}</span>
                )}
              </div>

              <div className="ai-actions">
                <Button
                  data-testid="ai-regenerate"
                  disabled={!canGenerate(form) || generating}
                  onClick={() => void generate(false)}
                >
                  {aiMessages.regenerate}
                </Button>
                <Button
                  type="primary"
                  data-testid="ai-save"
                  disabled={!canSave}
                  loading={saving}
                  onClick={() => void save()}
                >
                  {aiMessages.save}
                </Button>
              </div>
              {saveError !== null && <Alert type="error" showIcon title={saveError} />}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}