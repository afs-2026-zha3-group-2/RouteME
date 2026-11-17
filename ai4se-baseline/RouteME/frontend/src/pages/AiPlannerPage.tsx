/**
 * AI 智能规划页（add-ai-itinerary）：对话式输入 + 右侧完整行程预览（参考稿 v2）。
 *
 * 关键口径：
 * - 坐标 / 路线 / 距离 / 时间只来自高德，天气只来自 Open-Meteo，预算恒标「AI 估算」；
 * - 自然语言只解析「条件」，目的地名称仍需高德地理编码换成真实坐标（不虚构坐标）；
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
  Input,
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
import {
  applyIntent,
  parsePlanIntent,
  PLANNER_QUICK_ACTIONS,
  PLANNER_SUGGESTIONS,
} from '../ai/chatIntent';
import { itineraryToMarkdown } from '../ai/exportItinerary';
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
  geocodePlace,
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

/** 对话消息：assistant 的 plan / error 消息由页面状态渲染，文本消息自带正文。 */
type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  time: string;
  tone: 'default' | 'plan' | 'error';
};

const DEFAULT_CENTER = { lng: 113.264, lat: 23.129 };
const INTEREST_OPTIONS = ['美食', '摄影', 'City Walk', '自然', '历史', '购物', '艺术'];

function isResolved<T extends ResolvedStop>(stop: T): stop is T & { lng: number; lat: number } {
  return stop.resolved && stop.lng !== undefined && stop.lat !== undefined;
}

function toWaypoint(stop: ResolvedStop & { lng: number; lat: number }): RouteWaypoint {
  return { id: `stop-${stop.order}`, name: stop.name, lng: stop.lng, lat: stop.lat };
}

function clockNow(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

let messageSeq = 0;

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
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const routeTokenRef = useRef(0);
  const weatherTokenRef = useRef(0);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, generating]);

  const update = (patch: Partial<PlannerFormValues>) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  const pushMessage = useCallback((message: Pick<ChatMessage, 'role' | 'text' | 'tone'>) => {
    messageSeq += 1;
    const id = messageSeq;
    setMessages((previous) => [
      ...previous,
      { id, time: clockNow(), tone: message.tone, role: message.role, text: message.text },
    ]);
  }, []);

  /* ---------- 地点：搜索 / 地图点击（AC1 / AC2） ---------- */

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
    async (nextStops: ResolvedStop[], travelMode: AiTravelMode) => {
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
        const plan = await planRoute(travelMode, resolved.map(toWaypoint), city);
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
    [form.destination],
  );

  /* ---------- 生成 / 重新生成 / 降预算（AC5 / AC16 / E27） ---------- */

  const generate = async (
    reduceBudget = false,
    override?: PlannerFormValues,
    note?: string,
  ) => {
    const activeForm = override ?? form;
    if (!canGenerate(activeForm) || generating) {
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    setSaveError(null);
    try {
      const response = await generateAiItinerary(
        currentUser.id,
        toGenerateRequest(activeForm, reduceBudget),
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
      const resolved = await resolveStops(flat, activeForm.destination?.name);
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
      pushMessage({
        role: 'assistant',
        tone: 'plan',
        text: note === undefined ? aiMessages.planReady : aiMessages.planReadyFor(note),
      });
      void recalcRoute(nextStops, activeForm.travelMode);
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN_ERROR';
      setGenerateError(code);
      pushMessage({
        role: 'assistant',
        tone: 'error',
        text: aiErrorMessage(code),
      });
    } finally {
      setGenerating(false);
    }
  };

  /* ---------- 对话：自然语言 → 条件 → 生成 ---------- */

  const sendChat = async (raw: string) => {
    const text = raw.trim();
    if (text === '' || generating || sending) {
      return;
    }
    setComposer('');
    pushMessage({ role: 'user', tone: 'default', text });
    setSending(true);
    try {
      const intent = parsePlanIntent(text);
      let nextForm = form;
      if (intent.destinationName !== null) {
        let place: PlaceResult | null = null;
        try {
          place = await geocodePlace(intent.destinationName);
        } catch {
          place = null;
        }
        if (place !== null) {
          nextForm = {
            ...nextForm,
            destination: { name: place.name, lng: place.lng, lat: place.lat },
          };
          pushMessage({
            role: 'assistant',
            tone: 'default',
            text: aiMessages.intentDestination(place.name),
          });
        } else {
          pushMessage({
            role: 'assistant',
            tone: 'default',
            text: aiMessages.intentDestinationMissing(intent.destinationName),
          });
        }
      }
      nextForm = applyIntent(nextForm, { ...intent, destinationName: null });
      setForm(nextForm);
      const summary = aiMessages.intentSummary([
        intent.duration === null ? null : aiMessages.durationLabels[intent.duration],
        intent.budgetYuan === null ? null : aiMessages.intentBudget(intent.budgetYuan),
        intent.pace === null ? null : aiMessages.paceOptions[intent.pace],
        intent.interests.length === 0 ? null : intent.interests.join('、'),
      ]);
      if (!canGenerate(nextForm)) {
        pushMessage({
          role: 'assistant',
          tone: 'default',
          text: summary === '' ? aiMessages.chatNeedForm : aiMessages.chatNeedFormWith(summary),
        });
        return;
      }
      await generate(false, nextForm, summary === '' ? undefined : summary);
    } finally {
      setSending(false);
    }
  };

  /* ---------- 快捷动作：改条件后重新生成，或导出行程 ---------- */

  const runQuickAction = async (id: string) => {
    const action = PLANNER_QUICK_ACTIONS.find((entry) => entry.id === id);
    if (action === undefined || generating || sending) {
      return;
    }
    pushMessage({ role: 'user', tone: 'default', text: action.label });
    if (id === 'export') {
      exportItinerary();
      return;
    }
    let patch: Partial<PlannerFormValues>;
    if (id === 'more-stops') {
      const extra = form.interests.includes('小众') ? [] : ['小众'];
      patch = { interests: [...new Set([...form.interests, ...extra])] };
    } else if (id === 'family') {
      patch = { pace: 'relaxed', interests: [...new Set([...form.interests, '亲子'])] };
    } else {
      patch = { pace: 'compact' };
    }
    const nextForm = { ...form, ...patch };
    setForm(nextForm);
    if (!canGenerate(nextForm)) {
      pushMessage({ role: 'assistant', tone: 'default', text: aiMessages.chatNeedForm });
      return;
    }
    await generate(false, nextForm, action.label.replace(/^\+\s*/, ''));
  };

  /* ---------- 编辑：删除 / 更换 / 上移 / 下移，每次恰好重算一次 ---------- */

  const applyStops = (next: ResolvedStop[]) => {
    // itineraryEdit 的 spread / swap 保留对象上的 day 字段，这里只补类型口径。
    const dayStops = next as DayStop[];
    setStops(dayStops);
    setReplaceIndex(null);
    void recalcRoute(dayStops, form.travelMode);
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

  /* ---------- 保存 / 导出闭环（AC17 / L-01） ---------- */

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

  const exportItinerary = () => {
    if (planMeta === null || stops.length === 0) {
      pushMessage({ role: 'assistant', tone: 'default', text: aiMessages.exportEmpty });
      return;
    }
    const markdown = itineraryToMarkdown({
      title: planMeta.title,
      date: form.date,
      city: form.destination?.name ?? '',
      duration: aiMessages.durationLabels[form.duration],
      travelMode: aiMessages.modeOptions[form.travelMode],
      stops: stops.map((stop) => ({
        day: stop.day,
        arrival: stop.arrival,
        name: stop.name,
        reason: stop.reason,
        stayMinutes: stop.stay_minutes,
      })),
      tips: planMeta.tips,
      packing: planMeta.packing,
      budget: planMeta.budget,
      distance: route === null ? null : formatDistance(route.distanceMeters),
      durationText: route === null ? null : formatDuration(route.durationSeconds),
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${planMeta.title.replace(/[\\/:*?"<>|]/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    pushMessage({ role: 'assistant', tone: 'default', text: aiMessages.exported(planMeta.title) });
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
  const highlights = useMemo(() => {
    const names = stops.slice(0, 4).map((stop) => stop.name);
    const tip = planMeta?.tips[0];
    return tip === undefined ? names : [...names, tip];
  }, [stops, planMeta]);

  const busy = generating || sending;

  return (
    <main className="ai-chat-page">
      <header className="ai-hero">
        <div className="ai-hero-text">
          <Typography.Title level={2} className="ai-hero-title">
            {aiMessages.chatTitle}
          </Typography.Title>
          <p className="ai-hero-sub">{aiMessages.chatSubtitle}</p>
        </div>
        <Button className="page-back" onClick={() => (window.location.hash = '#/')}>
          {aiMessages.backHome}
        </Button>
      </header>

      <div className="ai-chat-grid">
        <section className="ai-chat-col" aria-label={aiMessages.chatTitle}>
          <Card className="panel ai-condition-card" data-testid="ai-conditions">
            <div className="ai-condition-head">
              <h3 className="panel-title">{aiMessages.conditionsTitle}</h3>
              <span className="form-hint">{aiMessages.conditionsHint}</span>
            </div>

            <div className="ai-condition-grid">
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
                    onChange={(value) =>
                      update({ budgetYuan: value === null ? '' : String(value) })
                    }
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
            </div>

            <div className="ai-condition-actions">
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
              <Button
                type="primary"
                data-testid="ai-generate"
                disabled={!canGenerate(form) || busy}
                loading={generating}
                onClick={() => void generate(false)}
              >
                {aiMessages.generate}
              </Button>
            </div>
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
                      setPickTarget(value === aiMessages.originLabel ? 'origin' : 'destination')
                    }
                  />
                </div>
                <span className="form-hint">{aiMessages.mapPickHint}</span>
              </div>
            )}
            {!canGenerate(form) && <p className="form-hint">{aiMessages.requiredHint}</p>}
          </Card>

          <div className="ai-thread" data-testid="ai-thread" aria-live="polite">
            <article className="ai-msg is-assistant">
              <span className="ai-avatar" aria-hidden="true">AI</span>
              <div className="ai-bubble">
                <p className="ai-bubble-title">{aiMessages.welcomeTitle}</p>
                <p className="ai-bubble-text">{aiMessages.welcomeIntro}</p>
                <p className="ai-bubble-text">{aiMessages.welcomePrompt}</p>
                <ul className="ai-welcome-list">
                  {PLANNER_SUGGESTIONS.slice(0, 5).map((suggestion) => (
                    <li key={suggestion.id}>{suggestion.text}</li>
                  ))}
                </ul>
                <p className="ai-bubble-text">{aiMessages.welcomeDetail}</p>
                <div className="ai-suggestions" data-testid="ai-suggestions">
                  {PLANNER_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="ai-suggestion-chip"
                      disabled={busy}
                      onClick={() => void sendChat(suggestion.text)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            </article>

            {messages.map((message) =>
              message.role === 'user' ? (
                <article key={message.id} className="ai-msg is-user">
                  <div className="ai-bubble is-user">
                    <p className="ai-bubble-text">{message.text}</p>
                    <span className="ai-msg-time">{message.time}</span>
                  </div>
                  <span className="ai-avatar is-user" aria-hidden="true">
                    {currentUser.nickname.slice(0, 1)}
                  </span>
                </article>
              ) : (
                <article key={message.id} className="ai-msg is-assistant">
                  <span className="ai-avatar" aria-hidden="true">AI</span>
                  <div className="ai-bubble">
                    {message.tone === 'plan' && planMeta !== null ? (
                      <>
                        <p className="ai-bubble-title">{message.text}</p>
                        <div className="ai-plan-summary">
                          <p className="ai-plan-summary-title">{planMeta.title}</p>
                          <ul className="ai-plan-highlights">
                            {highlights.map((item) => (
                              <li key={item}>✓ {item}</li>
                            ))}
                          </ul>
                          <div className="ai-plan-summary-meta">
                            <span>{aiMessages.planDays(planMeta.dayCount)}</span>
                            <span>
                              {aiMessages.budgetTotal}{' '}
                              {centsToYuan(sumBudgetCents(planMeta.budget))} 元
                            </span>
                            <span>{form.destination?.name ?? ''}</span>
                          </div>
                        </div>
                        <p className="ai-bubble-text">{aiMessages.planPreviewHint}</p>
                      </>
                    ) : message.tone === 'error' ? (
                      <div className="ai-msg-error" role="alert">
                        <span>{message.text}</span>
                        <Button
                          size="small"
                          data-testid="ai-error-retry"
                          disabled={busy}
                          onClick={() => void generate(false)}
                        >
                          {aiMessages.retry}
                        </Button>
                      </div>
                    ) : (
                      <p className="ai-bubble-text">{message.text}</p>
                    )}
                    <span className="ai-msg-time">{message.time}</span>
                  </div>
                </article>
              ),
            )}

            {generating && (
              <article className="ai-msg is-assistant" data-testid="ai-loading" role="status">
                <span className="ai-avatar" aria-hidden="true">AI</span>
                <div className="ai-bubble">
                  <div className="ai-card-loading">
                    <Spin size="small" />
                    <span>{aiMessages.loading}</span>
                  </div>
                  <span className="form-hint">{aiMessages.generatingHint}</span>
                </div>
              </article>
            )}
            <div ref={threadEndRef} />
          </div>

          <Card className="panel ai-composer">
            <Input.TextArea
              value={composer}
              data-testid="ai-composer"
              aria-label={aiMessages.composerLabel}
              className="ai-composer-input"
              placeholder={aiMessages.composerPlaceholder}
              autoSize={{ minRows: 1, maxRows: 4 }}
              onChange={(event) => setComposer(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  void sendChat(composer);
                }
              }}
            />
            <div className="ai-composer-bar">
              <div className="ai-composer-actions">
                {PLANNER_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="ai-quick-chip"
                    data-testid={`ai-quick-${action.id}`}
                    disabled={busy}
                    onClick={() => void runQuickAction(action.id)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <Button
                type="primary"
                data-testid="ai-send"
                disabled={composer.trim() === '' || busy}
                loading={sending}
                onClick={() => void sendChat(composer)}
              >
                {aiMessages.send}
              </Button>
            </div>
          </Card>
        </section>

        <aside className="ai-preview-col" aria-label={aiMessages.previewTitle}>
          <Card className="panel ai-preview-card">
            <div className="ai-preview-head">
              <div>
                <h3 className="panel-title">{aiMessages.previewTitle}</h3>
                <span className="form-hint">
                  {planMeta === null ? aiMessages.previewEmptyHint : aiMessages.previewHint}
                </span>
              </div>
              <div className="ai-preview-actions">
                <Button
                  size="small"
                  data-testid="ai-export"
                  disabled={planMeta === null}
                  onClick={exportItinerary}
                >
                  {aiMessages.export}
                </Button>
                <Button
                  size="small"
                  type="primary"
                  data-testid="ai-save"
                  disabled={!canSave}
                  loading={saving}
                  onClick={() => void save()}
                >
                  {aiMessages.publish}
                </Button>
              </div>
            </div>

            {planMeta === null ? (
              <div className="ai-preview-empty">
                <p className="ai-preview-empty-text">{aiMessages.emptyResult}</p>
                <dl className="ai-preview-facts">
                  <div>
                    <dt>{aiMessages.destinationLabel}</dt>
                    <dd>{form.destination?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>{aiMessages.dateLabel}</dt>
                    <dd>{form.date === '' ? '—' : form.date}</dd>
                  </div>
                  <div>
                    <dt>{aiMessages.durationLabel}</dt>
                    <dd>{aiMessages.durationLabels[form.duration]}</dd>
                  </div>
                  <div>
                    <dt>{aiMessages.budgetLabel}</dt>
                    <dd>{form.budgetYuan === '' ? '—' : `${form.budgetYuan} 元`}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <>
                <div className="ai-preview-meta">
                  <h4 className="ai-plan-title">{planMeta.title}</h4>
                  <div className="ai-preview-facts">
                    <div>
                      <dt>{aiMessages.dateLabel}</dt>
                      <dd>{form.date}</dd>
                    </div>
                    <div>
                      <dt>{aiMessages.destinationLabel}</dt>
                      <dd>{form.destination?.name ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>{aiMessages.durationLabel}</dt>
                      <dd>{aiMessages.durationLabels[form.duration]}</dd>
                    </div>
                    <div>
                      <dt>{aiMessages.budgetTotal}</dt>
                      <dd>约 {centsToYuan(sumBudgetCents(planMeta.budget))} 元</dd>
                    </div>
                  </div>
                  {form.interests.length > 0 && (
                    <div className="ai-preview-tags">
                      {form.interests.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  )}
                </div>

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
                            {stop.indoor && (
                              <Tag className="ai-indoor-tag">{aiMessages.indoorTag}</Tag>
                            )}
                            {!stop.resolved && (
                              <Tag className="ai-unresolved-tag">{aiMessages.unresolved}</Tag>
                            )}
                          </div>
                          <p className="ai-stop-reason">{stop.reason}</p>
                          <span className="ai-stop-stay">
                            {aiMessages.stayMinutes(stop.stay_minutes)}
                          </span>
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
                      {route === null
                        ? '—'
                        : formatDuration(route.durationSeconds + totalStaySeconds)}
                    </strong>
                  </div>
                  <span className="ai-stats-source">
                    {routeLoading ? aiMessages.routeLoading : aiMessages.statsSource}
                  </span>
                  {resolvedCount(stops) < 2 && (
                    <span className="form-hint">{aiMessages.minRouteStops}</span>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card className="panel ai-map-card">
            <div className="ai-map-head">
              <h3 className="panel-title">{aiMessages.mapTitle}</h3>
              <span className="form-hint">{aiMessages.mapSubtitle}</span>
            </div>
            <AmapContainer
              className="ai-map-container"
              lng={center.lng}
              lat={center.lat}
              zoom={11}
              ariaLabel={aiMessages.mapAriaLabel}
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
                  onClick={() => void recalcRoute(stops, form.travelMode)}
                >
                  {aiMessages.retry}
                </Button>
              </div>
            )}
          </Card>

          <Card className="panel ai-budget-card" data-testid="ai-budget-card">
            <h3 className="panel-title">
              {aiMessages.budgetTitle}
              <Tag className="ai-estimate-tag">{aiMessages.aiEstimate}</Tag>
            </h3>
            {planMeta === null ? (
              <p className="form-hint">{aiMessages.budgetEmpty}</p>
            ) : (
              <>
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
                    <Button size="small" disabled={busy} onClick={() => void generate(true)}>
                      {aiMessages.reduceBudget}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>

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
                <Button size="small" data-testid="ai-weather-retry" onClick={loadWeatherPreview}>
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

          <Card className="panel ai-tips-card">
            <h3 className="panel-title">{aiMessages.tipsTitle}</h3>
            {planMeta === null ? (
              <p className="form-hint">{aiMessages.tipsEmpty}</p>
            ) : (
              <>
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
              </>
            )}
          </Card>

          <div className="ai-actions">
            <Button
              data-testid="ai-regenerate"
              disabled={!canGenerate(form) || busy}
              onClick={() => void generate(false)}
            >
              {aiMessages.regenerate}
            </Button>
            <Button
              type="primary"
              data-testid="ai-save-secondary"
              disabled={!canSave}
              loading={saving}
              onClick={() => void save()}
            >
              {aiMessages.publish}
            </Button>
          </div>
          {generateError !== null && !generating && (
            <Alert
              type="error"
              showIcon
              title={aiErrorMessage(generateError)}
              description={aiMessages.errorHint}
            />
          )}
          {saveError !== null && <Alert type="error" showIcon title={saveError} />}
        </aside>
      </div>
    </main>
  );
}