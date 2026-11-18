/**
 * AI 智能规划页（add-ai-itinerary）：严格对齐参考稿 v3 —— 左侧「对话规划」卡片 +
 * 右侧「完整行程预览」卡片，桌面端两栏。
 *
 * 关键口径：
 * - 坐标 / 路线 / 距离 / 时间只来自高德，天气只来自 Open-Meteo，预算只标注为参考估算；
 * - 自然语言只解析「条件」，目的地名称仍需高德地理编码换成真实坐标（不虚构坐标）；
 * - 路线重算由事件驱动（生成完成 / 删除 / 更换 / 调序 / 重试），不走 effect；
 * - 天气预览（目的地 + 日期）与 generate 响应的权威天气用 token 守卫切换（L-02）；
 * - 条件表单收进抽屉、地图收进弹窗：两者都不占参考稿的版式位置。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Alert, Button, Card, Drawer, Input, Modal, Spin, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ApiError, fetchWeatherForecast, generateAiItinerary, saveAiItinerary } from '../api';
import { aiErrorMessage, aiMessages } from '../ai/aiMessages';
import { centsToYuan, overBudgetCents, sumBudgetCents } from '../ai/budgetMath';
import {
  applyIntent,
  parsePlanIntent,
  PLANNER_INSPIRATIONS,
  PLANNER_QUICK_ACTIONS,
} from '../ai/chatIntent';
import { itineraryToMarkdown } from '../ai/exportItinerary';
import { removeStop, replaceStop, resolvedCount } from '../ai/itineraryEdit';
import { liftArrivalsToFloor, moveStopTo, nowFloorMinutes, retimeStops } from '../ai/itineraryTimeline';
import {
  createPlannerSession,
  describeSession,
  loadSessionStore,
  upsertSession,
  writeSessionStore,
  type PlannerChatMessage as ChatMessage,
  type PlannerPlanMeta as PlanMeta,
  type PlannerPlanSnapshot,
  type PlannerSession,
  type PlannerSessionStore,
  type PlannerStop as DayStop,
} from '../ai/plannerSession';
import { resolveStops, type ResolvedStop } from '../ai/poiResolve';
import {
  canGenerate,
  clampPlanDate,
  defaultPlannerForm,
  todayIso,
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
  catalogPlaceResult,
  formatDistance,
  formatDuration,
  geocodePlace,
  planRoute,
  reverseGeocode,
  searchPlaces,
} from '../map/amap/AmapService';
import type { AmapMap, LngLat } from '../map/amap/types';
import { BrandMark } from '../shell/BrandMark';
import { cityPhoto } from '../trips/cityPhotos';
import { formatMonthDay, weekdayLabel } from '../trips/tripDateFormat';
import type {
  AiPlanStop,
  AiTravelMode,
  DemoUser,
  PlaceResult,
  RoutePlan,
  RouteWaypoint,
  WeatherForecast,
} from '../types';

// 与发布页一致：日期弹层月份名保持中文。
dayjs.locale('zh-cn');

type Props = {
  currentUser: DemoUser;
};

type ReplyTab = 'overview' | 'day' | 'food' | 'stay' | 'budget';

const DEFAULT_CENTER = { lng: 113.264, lat: 23.129 };

function isResolved<T extends ResolvedStop>(stop: T): stop is T & { lng: number; lat: number } {
  return stop.resolved && stop.lng !== undefined && stop.lat !== undefined;
}

function toWaypoint(stop: ResolvedStop & { lng: number; lat: number }): RouteWaypoint {
  return { id: `stop-${stop.order}`, name: stop.name, lng: stop.lng, lat: stop.lat, city: stop.city };
}

function clockNow(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** 城市名 → 真实坐标：地理编码优先，其次地点搜索，最后离线地名库。 */
async function resolveCityPlace(name: string): Promise<PlaceResult | null> {
  try {
    const geocoded = await geocodePlace(name);
    if (geocoded !== null) {
      return geocoded;
    }
  } catch {
    // 继续尝试搜索口径。
  }
  try {
    const results = await searchPlaces(name);
    if (results.length > 0) {
      return results[0];
    }
  } catch {
    // 继续尝试离线地名库。
  }
  return catalogPlaceResult(name);
}

/** 行程主题：从 AI 给出的停留理由里提炼，用于「Day N · 主题」标题。 */
function dayThemes(stops: DayStop[]): string {
  const themes: string[] = [];
  const push = (value: string) => {
    if (!themes.includes(value)) {
      themes.push(value);
    }
  };
  for (const stop of stops) {
    if (/餐|美食|小吃|甜品|咖啡|茶餐厅/.test(stop.reason + stop.name)) {
      push('美食探索');
    }
    if (/拍照|打卡|出片|观景|日落/.test(stop.reason + stop.name)) {
      push('拍照打卡');
    }
    if (stop.indoor) {
      push('室内展馆');
    }
    if (/漫步|步行|散步|city\s*walk/i.test(stop.reason + stop.name)) {
      push('城市漫步');
    }
  }
  if (themes.length === 0) {
    push('城市漫游');
  }
  return themes.slice(0, 3).join(' · ');
}

/** 美食站点：名称或推荐理由里带餐饮关键词。 */
function isFoodStop(stop: DayStop): boolean {
  return /餐|美食|小吃|甜品|咖啡|茶餐厅|牛肉|烧鹅|火锅|粉|面/.test(`${stop.name}${stop.reason}`);
}

/** 会话 id → 会话；id 失效时退回第一份，保证页面永远有可用上下文。 */
function pickActiveSession(store: PlannerSessionStore): PlannerSession {
  return store.sessions.find((session) => session.id === store.activeId) ?? store.sessions[0];
}

/**
 * 历史方案气泡：只列那一刻的景点与到达时间。
 *
 * <p>不读页面当前 stops / planMeta —— 否则同一会话里每条方案消息都会渲染成
 * 同一份最新方案，看起来就是「两条一模一样的回答」。
 */
function PlanHistoryBubble({ message }: { message: ChatMessage }) {
  const plan = message.plan ?? null;
  return (
    <div className="ai-plan-history" data-testid="ai-plan-history">
      <p className="ai-bubble-title">{message.text}</p>
      {plan === null || plan.stops.length === 0 ? (
        <p className="ai-bubble-text">{aiMessages.planHistoryLegacy}</p>
      ) : (
        <>
          <p className="ai-bubble-text">
            {aiMessages.planHistoryLead(plan.title, plan.dayCount)}
          </p>
          <ul className="ai-plan-history-list">
            {plan.stops.map((stop) => (
              <li key={`${stop.day}-${stop.arrival}-${stop.name}`}>
                <span className="ai-reply-time">{stop.arrival}</span>
                <span className="ai-reply-name">{stop.name}</span>
                <span className="ai-plan-history-day">Day {stop.day}</span>
              </li>
            ))}
          </ul>
          <p className="ai-bubble-text ai-reply-foot">{aiMessages.planHistoryFoot}</p>
        </>
      )}
    </div>
  );
}

export function AiPlannerPage({ currentUser }: Props) {
  // 每个用户一份本机会话列表：两段旅行各自一条会话，切换即切换整份上下文。
  const [sessionStore, setSessionStore] = useState<PlannerSessionStore>(() =>
    loadSessionStore(currentUser.id),
  );
  const initialSession = pickActiveSession(sessionStore);
  const [activeSessionId, setActiveSessionId] = useState(initialSession.id);
  const [form, setForm] = useState<PlannerFormValues>(initialSession.form);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [planMeta, setPlanMeta] = useState<PlanMeta | null>(initialSession.planMeta);
  const [stops, setStops] = useState<DayStop[]>(initialSession.stops);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(initialSession.weather);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [replaceCandidates, setReplaceCandidates] = useState<PlaceResult[] | null>(null);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [map, setMap] = useState<AmapMap | null>(null);
  const [replaceMap, setReplaceMap] = useState<AmapMap | null>(null);
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialSession.messages);
  const [replyTab, setReplyTab] = useState<ReplyTab>('overview');
  const [replyDay, setReplyDay] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const routeTokenRef = useRef(0);
  const weatherTokenRef = useRef(0);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const hydratingRef = useRef(false);
  const userIdRef = useRef(currentUser.id);
  const messageSeqRef = useRef(
    initialSession.messages.reduce((max, message) => Math.max(max, message.id), 0) + 1,
  );

  /** 把一份会话装载进页面状态（切换历史 / 新建对话 / 换用户都走这里）。 */
  const hydrate = useCallback((session: PlannerSession) => {
    hydratingRef.current = true;
    // 切换会话时让上一会话仍在飞行的路线 / 天气请求失效，避免串到新会话。
    routeTokenRef.current += 1;
    weatherTokenRef.current += 1;
    setActiveSessionId(session.id);
    setForm(session.form);
    setMessages(session.messages);
    setPlanMeta(session.planMeta);
    setStops(session.stops);
    setWeather(session.weather);
    setWeatherLoading(false);
    setWeatherError(false);
    setGenerateError(null);
    setSaveError(null);
    setRoute(null);
    setRouteError(null);
    setReplaceIndex(null);
    setReplaceCandidates(null);
    setFocusId(null);
    setReplyTab('overview');
    setReplyDay(1);
    messageSeqRef.current =
      session.messages.reduce((max, message) => Math.max(max, message.id), 0) + 1;
    window.setTimeout(() => {
      hydratingRef.current = false;
    }, 0);
  }, []);

  // 换用户：各自读取自己的历史，绝不把上一个用户的上下文带过去。
  useEffect(() => {
    if (userIdRef.current === currentUser.id) {
      return;
    }
    userIdRef.current = currentUser.id;
    const next = loadSessionStore(currentUser.id);
    setSessionStore(next);
    hydrate(pickActiveSession(next));
  }, [currentUser.id, hydrate]);

  // 会话状态变化 → 写回本机（按用户隔离）。hydrate 期间跳过，避免把旧会话写成新会话。
  useEffect(() => {
    if (hydratingRef.current) {
      return;
    }
    setSessionStore((previous) => {
      const current = previous.sessions.find((session) => session.id === activeSessionId);
      if (current === undefined) {
        return previous;
      }
      const nextSession: PlannerSession = {
        ...current,
        title: describeSession(form, messages),
        updatedAt: Date.now(),
        form,
        messages,
        planMeta,
        stops,
        weather,
      };
      const nextStore = upsertSession(previous, nextSession);
      writeSessionStore(currentUser.id, nextStore);
      return nextStore;
    });
  }, [activeSessionId, currentUser.id, form, messages, planMeta, stops, weather]);

  useEffect(() => {
    // 首屏不滚动（欢迎语已可见），只在有新消息 / 生成中时把最新一条带进视野。
    if (messages.length === 0 && !generating) {
      return;
    }
    threadEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length, generating]);

  const busy = generating || sending;

  const pushMessage = useCallback(
    (
      message: Pick<ChatMessage, 'role' | 'text' | 'tone'> & Partial<Pick<ChatMessage, 'plan'>>,
    ) => {
      const id = messageSeqRef.current;
      messageSeqRef.current += 1;
      setMessages((previous) => [
        ...previous,
        {
          id,
          time: clockNow(),
          tone: message.tone,
          role: message.role,
          text: message.text,
          plan: message.plan ?? null,
        },
      ]);
    },
    [],
  );

  /** 今天出行时首日从「此刻」起算，避免重排后第一站落在已经过去的时间。 */
  const firstDayStart = useCallback((): number | undefined => {
    return form.date === todayIso() ? nowFloorMinutes() : undefined;
  }, [form.date]);

  /* ---------- 天气：预览（目的地 + 日期）→ generate 权威切换（L-02） ---------- */

  const loadWeatherPreview = useCallback(() => {
    const destination = form.destination;
    if (destination === null || form.date === '') {
      return;
    }
    const token = weatherTokenRef.current;
    setWeatherLoading(true);
    setWeatherError(false);
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

  /* ---------- 路线：事件驱动重算，token 丢弃过期响应 ---------- */

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
        // transit 需要城市名限定换乘范围：优先用高德解析出的城市（空串不算），
        // 再退到目的地名称；两处都没有时 planRoute 会给出可读提示。
        const stopCity = resolved.find((stop) => (stop.city ?? '').trim() !== '')?.city ?? '';
        const city = stopCity.trim() !== '' ? stopCity : (form.destination?.name ?? '');
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

  // 切到带行程的历史会话 / 用户时补算路线；路线体积大且可重算，不进本机存储。
  useEffect(() => {
    if (stops.filter(isResolved).length >= 2) {
      void recalcRoute(stops, form.travelMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  /* ---------- 生成 / 重新生成 / 降预算 ---------- */

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
    setReplyTab('overview');
    try {
      const response = await generateAiItinerary(
        currentUser.id,
        toGenerateRequest(activeForm, reduceBudget),
      );
      const plan = response.plan;
      const flat: AiPlanStop[] = [];
      const dayOf: number[] = [];
      // 天序号按返回顺序归一为 1..n：AI 偶尔只回 day:2（两日行程缺第一天），
      // 直接照抄会出现「只有 Day 2」或空白的诡异时间轴。
      plan.days.forEach((day, dayIndex) => {
        for (const stop of day.stops) {
          flat.push(stop);
          dayOf.push(dayIndex + 1);
        }
      });
      // POI 坐标逐个经高德解析；失败标「未定位」，不伪造坐标（AC6）。
      const resolved = await resolveStops(flat, activeForm.destination?.name);
      const resolvedStops: DayStop[] = resolved.map((stop, index) => ({
        ...stop,
        day: dayOf[index] ?? 1,
      }));
      // 旅行日期就是今天时，AI 并不知道用户此刻几点：把它给出的当天到达时间整体后移，
      // 避免「已经 15:36 了，方案第一站却写着 09:30」这种排到过去的行程。
      const nextStops = liftArrivalsToFloor(
        resolvedStops,
        activeForm.date === todayIso() ? nowFloorMinutes() : null,
      );
      const planSnapshot: PlannerPlanSnapshot = {
        title: plan.title,
        dayCount: plan.days.length,
        stops: nextStops.map((stop) => ({
          name: stop.name,
          day: stop.day,
          arrival: stop.arrival,
        })),
      };
      setPlanMeta({
        title: plan.title,
        tips: plan.tips,
        packing: plan.packing,
        budget: plan.budget,
        dayCount: plan.days.length,
      });
      setStops(nextStops);
      setReplyDay(1);
      weatherTokenRef.current += 1;
      // 后端契约里 weather 可能缺省（旧版本 / 上游失败），缺省按「无天气」渲染。
      setWeather(response.weather ?? null);
      setWeatherError(false);
      setWeatherLoading(false);
      setReplaceIndex(null);
      setFocusId(null);
      pushMessage({
        role: 'assistant',
        tone: 'plan',
        text: note === undefined ? aiMessages.planReady : aiMessages.planReadyFor(note),
        // 每条方案消息只认自己的快照，旧消息不会被最新方案覆盖成相同内容。
        plan: planSnapshot,
      });
      void recalcRoute(nextStops, activeForm.travelMode);
      return nextStops;
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN_ERROR';
      setGenerateError(code);
      pushMessage({ role: 'assistant', tone: 'error', text: aiErrorMessage(code) });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  /* ---------- 多会话：切换 / 新建 ---------- */

  const beginSession = useCallback(
    (session: PlannerSession) => {
      setSessionStore((previous) => {
        const next = {
          activeId: session.id,
          sessions: [session, ...previous.sessions.filter((entry) => entry.id !== session.id)],
        };
        writeSessionStore(currentUser.id, next);
        return next;
      });
      hydrate(session);
    },
    [currentUser.id, hydrate],
  );

  const newChat = () => {
    if (busy) {
      return;
    }
    beginSession(createPlannerSession(defaultPlannerForm()));
    setComposer('');
    window.setTimeout(() => document.getElementById('ai-composer-input')?.focus(), 0);
  };

  /** 从历史抽屉切回某段对话：整份上下文一起换回来，旧对话不会被清空。 */
  const openSession = (id: string) => {
    if (busy || id === activeSessionId) {
      setHistoryOpen(false);
      return;
    }
    const target = sessionStore.sessions.find((session) => session.id === id);
    if (target === undefined) {
      return;
    }
    hydrate(target);
    setSessionStore((previous) => {
      const next = { ...previous, activeId: id };
      writeSessionStore(currentUser.id, next);
      return next;
    });
    setHistoryOpen(false);
  };

  /* ---------- 对话：像助手一样理解条件、主动追问、直接出方案 ---------- */

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
      let resolvedDestination: string | null = null;
      let unresolvedDestination: string | null = null;

      if (intent.destinationName !== null) {
        const place = await resolveCityPlace(intent.destinationName);
        if (place !== null) {
          resolvedDestination = place.name;
          nextForm = {
            ...nextForm,
            destination: { name: place.name, lng: place.lng, lat: place.lat },
          };
        } else {
          unresolvedDestination = intent.destinationName;
        }
      }

      let resolvedOrigin: string | null = null;
      let unresolvedOrigin: string | null = null;
      if (intent.originName !== null) {
        const place = await resolveCityPlace(intent.originName);
        if (place !== null) {
          resolvedOrigin = place.name;
          nextForm = {
            ...nextForm,
            origin: { name: place.name, lng: place.lng, lat: place.lat },
          };
        } else {
          unresolvedOrigin = intent.originName;
        }
      }

      nextForm = applyIntent(nextForm, {
        ...intent,
        destinationName: null,
        originName: null,
      });
      // 对话里说了一个已经过去的日期（「11 月 1 日」而今天已 11 月 18 日）时按今天算，
      // 不让 AI 去规划一份排在过去的行程。
      nextForm = { ...nextForm, date: clampPlanDate(nextForm.date) };

      // 换了一个目的地且当前会话已有内容：开一份新会话，两段旅行互不覆盖。
      const currentDestination = form.destination?.name ?? '';
      const startsNewTrip =
        resolvedDestination !== null &&
        resolvedDestination !== currentDestination &&
        resolvedDestination !== '' &&
        (messages.length > 0 || planMeta !== null);
      if (startsNewTrip) {
        beginSession(createPlannerSession(nextForm));
      }

      setForm(nextForm);

      if (unresolvedDestination !== null) {
        pushMessage({
          role: 'assistant',
          tone: 'default',
          text: aiMessages.intentDestinationMissing(unresolvedDestination),
        });
        return;
      }
      if (unresolvedOrigin !== null) {
        pushMessage({
          role: 'assistant',
          tone: 'default',
          text: aiMessages.intentOriginMissing(unresolvedOrigin),
        });
        return;
      }

      // 没提出发地：默认从目的地同城出发，并在消息里说明（agent 不静默替用户决定）。
      let originNote: string | null = null;
      if (nextForm.origin === null && nextForm.destination !== null) {
        const assumed = nextForm.destination;
        nextForm = { ...nextForm, origin: assumed };
        originNote = aiMessages.originAssumed(assumed.name);
      }

      const summary = aiMessages.intentSummary([
        resolvedDestination ?? intent.destinationName,
        resolvedOrigin,
        intent.date === null ? null : intent.date,
        intent.duration === null ? null : aiMessages.durationLabels[intent.duration],
        intent.budgetYuan === null ? null : aiMessages.intentBudget(intent.budgetYuan),
        intent.pace === null ? null : aiMessages.paceOptions[intent.pace],
        intent.interests.length === 0 ? null : intent.interests.join('、'),
      ]);

      if (!canGenerate(nextForm)) {
        // 还缺关键条件：像一个助理那样把问题问清楚，而不是让用户去找表单。
        pushMessage({
          role: 'assistant',
          tone: 'default',
          text: aiMessages.agentAskDestination,
        });
        return;
      }

      await generate(false, nextForm, summary === '' ? undefined : summary);
      if (originNote !== null) {
        pushMessage({ role: 'assistant', tone: 'default', text: originNote });
      }
    } finally {
      setSending(false);
    }
  };

  /* ---------- 快捷动作 / 行程优化 ---------- */

  const runQuickAction = async (id: string) => {
    const action = PLANNER_QUICK_ACTIONS.find((entry) => entry.id === id);
    if (action === undefined || generating || sending) {
      return;
    }
    pushMessage({ role: 'user', tone: 'default', text: aiMessages.quickPrompts[id] ?? action.label });
    if (id === 'export') {
      exportItinerary();
      return;
    }
    let patch: Partial<PlannerFormValues>;
    if (id === 'more-stops') {
      patch = {
        interests: [...new Set([...form.interests, '小众'])],
        pace: 'relaxed',
      };
    } else if (id === 'family') {
      patch = { pace: 'relaxed', interests: [...new Set([...form.interests, '亲子', '自然'])] };
    } else {
      patch = { pace: 'compact' };
    }
    const nextForm = { ...form, ...patch };
    setForm(nextForm);
    if (!canGenerate(nextForm)) {
      pushMessage({ role: 'assistant', tone: 'default', text: aiMessages.agentAskDestination });
      return;
    }
    setSending(true);
    try {
      const before = new Set(stops.map((stop) => stop.name));
      const nextStops = await generate(false, nextForm, action.label.replace(/^\+\s*/, ''));
      if (Array.isArray(nextStops)) {
        const added = nextStops
          .map((stop) => stop.name)
          .filter((name) => !before.has(name));
        pushMessage({
          role: 'assistant',
          tone: 'default',
          text: aiMessages.quickApplied(id, added),
        });
      }
    } finally {
      setSending(false);
    }
  };

  /* ---------- 编辑：删除 / 更换 / 上移 / 下移 / 拖拽 ---------- */

  /** 任何顺序变化后都按新顺序重排时间，避免「09:00 → 16:00 → 11:30」的时间倒序。 */
  const applyStops = (next: ResolvedStop[]) => {
    const dayStops = retimeStops(next as DayStop[], firstDayStart());
    setStops(dayStops);
    setReplaceIndex(null);
    setReplaceCandidates(null);
    setFocusId(null);
    setDropIndex(null);
    setDragIndex(null);
    void recalcRoute(dayStops, form.travelMode);
  };

  const onStopDragStart = (event: DragEvent<HTMLLIElement>, index: number) => {
    dragFromRef.current = index;
    setDragIndex(index);
    setDropIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    // 拖拽预览：克隆整行做半透明浮层，用户能看清正在拖哪一条。
    const row = event.currentTarget;
    const ghost = row.cloneNode(true) as HTMLElement;
    ghost.classList.add('ai-drag-ghost');
    ghost.style.width = `${row.getBoundingClientRect().width}px`;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 28, 22);
    window.setTimeout(() => ghost.remove(), 0);
  };

  const onStopDragOver = (event: DragEvent<HTMLLIElement>, index: number) => {
    if (dragFromRef.current === null) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropIndex !== index) {
      setDropIndex(index);
    }
  };

  const onStopDrop = (event: DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault();
    const from = dragFromRef.current;
    dragFromRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
    if (from === null || from === index) {
      return;
    }
    applyStops(moveStopTo(stops, from, index));
  };

  const endDrag = () => {
    dragFromRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  };

  const openReplace = (index: number) => {
    setReplaceIndex((previous) => (previous === index ? null : index));
    setReplaceCandidates(null);
    setReplaceLoading(false);
  };

  const handleReplaceMapClick = (point: LngLat) => {
    setReplaceLoading(true);
    setReplaceCandidates([]);
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
        setReplaceCandidates(list);
      })
      .finally(() => setReplaceLoading(false));
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

  /* ---------- 保存 / 导出闭环 ---------- */

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
  const canSave = planMeta !== null && resolvedCount(stops) >= 2 && !saving && !generating;

  const days = useMemo(() => {
    const grouped: Array<{ day: number; stops: DayStop[] }> = [];
    for (const stop of stops) {
      const last = grouped[grouped.length - 1];
      if (last === undefined || last.day !== stop.day) {
        grouped.push({ day: stop.day, stops: [stop] });
      } else {
        last.stops.push(stop);
      }
    }
    return grouped;
  }, [stops]);

  const dayDate = (day: number): string => {
    if (form.date === '') {
      return '';
    }
    return dayjs(form.date).add(day - 1, 'day').format('YYYY-MM-DD');
  };

  const budgetTotal = planMeta === null ? null : centsToYuan(sumBudgetCents(planMeta.budget));
  const destinationLabel = form.destination?.name ?? '目的地';
  const cover = cityPhoto(destinationLabel, destinationLabel.replace(/市$/, ''));
  const foodStops = useMemo(() => stops.filter(isFoodStop), [stops]);
  const highlights = useMemo(() => {
    const tips = planMeta?.tips.slice(0, 3) ?? [];
    const firstNames = stops.slice(0, 2).map((stop) => stop.name);
    const merged = [
      ...(firstNames.length > 0 ? [`打卡 ${firstNames.join('、')} 等经典机位`] : []),
      ...tips,
    ];
    return merged.slice(0, 4);
  }, [planMeta, stops]);

  const themesSeed = useMemo(() => dayThemes(stops), [stops]);
  const replyDays = days.length > 0 ? days : [{ day: 1, stops: [] as DayStop[] }];
  // 只有最新一条方案消息绑定页面上可交互的实时方案；历史方案渲染各自的快照，
  // 否则同一会话里所有「已生成」气泡会长得一模一样（用户看到的就是「两条相同的回答」）。
  const latestPlanId = useMemo(() => {
    let latest: number | null = null;
    for (const message of messages) {
      if (message.tone === 'plan' && (latest === null || message.id > latest)) {
        latest = message.id;
      }
    }
    return latest;
  }, [messages]);

  return (
    <main className="ai-page">
      <header className="ai-page-head">
        <div>
          <Typography.Title level={2} className="ai-page-title">
            {aiMessages.chatTitle}
          </Typography.Title>
          <p className="ai-page-sub">{aiMessages.chatSubtitle}</p>
        </div>
        <Button className="page-back" onClick={() => (window.location.hash = '#/')}>
          {aiMessages.backHome}
        </Button>
      </header>

      <div className="ai-layout">
        {/* ==================== 左：对话规划 ==================== */}
        <Card className="panel ai-chat-card" data-testid="ai-thread-card">
          <div className="ai-chat-toolbar">
            <span className="ai-chat-toolbar-title">{aiMessages.tabPlan}</span>
            <div className="ai-chat-toolbar-actions">
              <Button
                size="small"
                data-testid="ai-history-toggle"
                disabled={busy}
                onClick={() => setHistoryOpen(true)}
              >
                {aiMessages.historyEntry(sessionStore.sessions.length)}
              </Button>
              <Button
                size="small"
                type="primary"
                data-testid="ai-new-chat"
                disabled={busy}
                onClick={newChat}
              >
                {aiMessages.newChat}
              </Button>
            </div>
          </div>

          <div className="ai-inspiration-row" data-testid="ai-suggestions">
            <span className="ai-inspiration-label">{aiMessages.inspirationLabel}</span>
            {PLANNER_INSPIRATIONS.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="ai-inspiration-chip"
                disabled={busy}
                onClick={() => void sendChat(suggestion.text)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>

          <div className="ai-thread" data-testid="ai-thread" aria-live="polite">
            <article className="ai-msg is-assistant">
              <span className="ai-avatar" aria-hidden="true">
                <BrandMark />
              </span>
              <div className="ai-bubble">
                <p className="ai-bubble-title">{aiMessages.welcomeTitle}</p>
                <p className="ai-bubble-text">{aiMessages.welcomeIntro}</p>
                <p className="ai-bubble-text">{aiMessages.welcomePrompt}</p>
                <ul className="ai-welcome-list">
                  {PLANNER_INSPIRATIONS.slice(0, 4).map((suggestion) => (
                    <li key={suggestion.id}>{suggestion.text}</li>
                  ))}
                </ul>
                <p className="ai-bubble-text">{aiMessages.welcomeDetail}</p>
              </div>
              <span className="ai-msg-time">{clockNow()}</span>
            </article>

            {messages.map((message) =>
              message.role === 'user' ? (
                <article key={message.id} className="ai-msg is-user">
                  <span className="ai-msg-time">{message.time}</span>
                  <div className="ai-bubble is-user">
                    <p className="ai-bubble-text">{message.text}</p>
                  </div>
                  <span className="ai-avatar is-user" aria-hidden="true">
                    {currentUser.nickname.slice(0, 1)}
                  </span>
                </article>
              ) : (
                <article key={message.id} className="ai-msg is-assistant">
                  <span className="ai-avatar" aria-hidden="true">
                    <BrandMark />
                  </span>
                  <div className="ai-bubble">
                    {message.tone === 'plan' && message.id === latestPlanId && planMeta !== null ? (
                      <div className="ai-plan-reply">
                        <p className="ai-bubble-title">{message.text}</p>
                        <p className="ai-bubble-text">{aiMessages.planReplyLead}</p>

                        <div className="ai-reply-tabs" role="tablist">
                          {[
                            { id: 'overview' as ReplyTab, label: aiMessages.replyOverview },
                            ...replyDays.map((entry) => ({
                              id: 'day' as ReplyTab,
                              day: entry.day,
                              label: `Day ${entry.day}`,
                            })),
                            { id: 'food' as ReplyTab, label: aiMessages.replyFood },
                            { id: 'stay' as ReplyTab, label: aiMessages.replyStay },
                            { id: 'budget' as ReplyTab, label: aiMessages.replyBudget },
                          ].map((tab) => {
                            const active =
                              replyTab === tab.id &&
                              (tab.id !== 'day' || (tab as { day?: number }).day === replyDay);
                            return (
                              <button
                                key={`${tab.id}-${(tab as { day?: number }).day ?? ''}`}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                className={active ? 'ai-reply-tab is-active' : 'ai-reply-tab'}
                                onClick={() => {
                                  setReplyTab(tab.id);
                                  if (tab.id === 'day') {
                                    setReplyDay((tab as { day?: number }).day ?? 1);
                                  }
                                }}
                              >
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>

                        {replyTab === 'overview' && (
                          <div className="ai-overview" data-testid="ai-plan-overview">
                            <div className="ai-overview-cover">
                              {cover !== null ? (
                                <img src={cover} alt={`${destinationLabel}城市照片`} />
                              ) : (
                                <span className="ai-overview-cover-fallback" aria-hidden="true" />
                              )}
                              <div className="ai-overview-cover-text">
                                <strong>{destinationLabel.replace(/市$/, '')}</strong>
                                <span>{aiMessages.durationLabels[form.duration]}</span>
                                <em>
                                  {form.interests.length > 0
                                    ? form.interests.slice(0, 3).join(' · ')
                                    : themesSeed}
                                </em>
                              </div>
                            </div>
                            <div className="ai-overview-side">
                              <h4 className="ai-overview-title">{aiMessages.highlightTitle}</h4>
                              <ul className="ai-plan-highlights">
                                {highlights.map((item) => (
                                  <li key={item}>✓ {item}</li>
                                ))}
                              </ul>
                              <div className="ai-overview-pills">
                                <span className="ai-pill">
                                  <em>{aiMessages.planDays(planMeta.dayCount)}</em>
                                  {aiMessages.paceOptions[form.pace]}
                                </span>
                                <span className="ai-pill">
                                  <em>{aiMessages.suitableFor}</em>
                                  {aiMessages.suitableAudience}
                                </span>
                                <span className="ai-pill">
                                  <em>约 ¥{budgetTotal ?? 0}</em>
                                  {aiMessages.budgetExcludeTransport}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {replyTab === 'day' && (
                          <ul className="ai-reply-day-list">
                            {(replyDays.find((entry) => entry.day === replyDay)?.stops ?? []).map(
                              (stop) => (
                                <li key={`${stop.order}-${stop.name}`}>
                                  <span className="ai-reply-time">{stop.arrival}</span>
                                  <span className="ai-reply-name">{stop.name}</span>
                                  <span className="ai-reply-reason">{stop.reason}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        )}

                        {replyTab === 'food' && (
                          <ul className="ai-reply-day-list">
                            {foodStops.length === 0 ? (
                              <li className="ai-reply-empty">{aiMessages.noFoodStops}</li>
                            ) : (
                              foodStops.map((stop) => (
                                <li key={`food-${stop.order}`}>
                                  <span className="ai-reply-time">{stop.arrival}</span>
                                  <span className="ai-reply-name">{stop.name}</span>
                                  <span className="ai-reply-reason">{stop.reason}</span>
                                </li>
                              ))
                            )}
                          </ul>
                        )}

                        {replyTab === 'stay' && (
                          <ul className="ai-reply-bullets">
                            {planMeta.tips.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                            {planMeta.packing.length > 0 && (
                              <li>
                                {aiMessages.packingTitle}：{planMeta.packing.join('、')}
                              </li>
                            )}
                          </ul>
                        )}

                        {replyTab === 'budget' && (
                          <dl className="ai-reply-budget">
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
                            <div className="ai-reply-budget-total">
                              <dt>{aiMessages.budgetTotal}</dt>
                              <dd>{budgetTotal} 元</dd>
                            </div>
                          </dl>
                        )}

                        <p className="ai-bubble-text ai-reply-foot">{aiMessages.planPreviewHint}</p>
                      </div>
                    ) : message.tone === 'plan' ? (
                      <PlanHistoryBubble message={message} />
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
                  </div>
                  <span className="ai-msg-time">{message.time}</span>
                </article>
              ),
            )}

            {generating && (
              <article className="ai-msg is-assistant" data-testid="ai-loading" role="status">
                <span className="ai-avatar" aria-hidden="true">
                  <BrandMark />
                </span>
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

          <div className="ai-composer">
            <Input.TextArea
              id="ai-composer-input"
              value={composer}
              data-testid="ai-composer"
              aria-label={aiMessages.composerLabel}
              className="ai-composer-input"
              placeholder={aiMessages.composerPlaceholder}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => setComposer(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  void sendChat(composer);
                }
              }}
            />
            <Button
              className="ai-send"
              type="primary"
              data-testid="ai-send"
              aria-label={aiMessages.send}
              disabled={composer.trim() === '' || busy}
              loading={sending}
              onClick={() => void sendChat(composer)}
            >
              {aiMessages.send}
            </Button>
          </div>
          <div className="ai-composer-hint">{aiMessages.composerEnterHint}</div>
          <div className="ai-quick-row">
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
        </Card>

        {/* ==================== 右：完整行程预览 ==================== */}
        <section className="ai-preview" aria-label={aiMessages.previewTitle}>
          <Card className="panel ai-preview-card" data-testid="ai-preview">
            <header className="ai-preview-head">
              <span className="ai-preview-icon" aria-hidden="true">
                <BrandMark />
              </span>
              <div className="ai-preview-head-text">
                <h3 className="panel-title">{aiMessages.previewTitle}</h3>
                <span className="form-hint">{aiMessages.previewSubtitle}</span>
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
            </header>

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
                    <dd>{form.budgetYuan === '' ? '—' : `约 ¥${form.budgetYuan}`}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="ai-preview-body">
                <h4 className="ai-preview-title">{planMeta.title}</h4>
                <div className="ai-preview-meta">
                  <span>
                    {formatMonthDay(form.date)}
                    {planMeta.dayCount > 1
                      ? ` - ${formatMonthDay(dayDate(planMeta.dayCount))}`
                      : `（${weekdayLabel(form.date)}）`}
                  </span>
                  <span className="ai-preview-meta-dot" aria-hidden="true">
                    ·
                  </span>
                  <span>{destinationLabel}</span>
                  <span className="ai-preview-meta-dot" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {aiMessages.aboutBudget} ¥{budgetTotal ?? 0}
                  </span>
                </div>

                <div className="ai-preview-weather">
                  <span className="ai-preview-weather-title">{aiMessages.weatherTitle}</span>
                  {weatherLoading ? (
                    <span className="form-hint">{aiMessages.weatherLoading}</span>
                  ) : weatherError ? (
                    <span className="ai-preview-weather-error">
                      {aiMessages.weatherFailed}
                      <Button size="small" type="link" data-testid="ai-weather-retry" onClick={loadWeatherPreview}>
                        {aiMessages.retry}
                      </Button>
                    </span>
                  ) : weather !== null && weather.available && weather.weather !== null ? (
                    <span className="ai-preview-weather-body">
                      {weather.weather.temp_max_c}° / {weather.weather.temp_min_c}°
                      {' · '}
                      {weather.weather.weather_text}
                      {' · '}
                      {aiMessages.precipitationProbability} {weather.weather.precipitation_probability_pct ?? '—'}%
                      {weather.weather.wind_speed_kmh !== null &&
                        ` · ${aiMessages.windSpeed} ${weather.weather.wind_speed_kmh} km/h`}
                    </span>
                  ) : (
                    <span className="form-hint">{aiMessages.weatherEmpty}</span>
                  )}
                </div>
                {/* 天气卡 testid 保留：既有 E2E 用同一节点断言温度与降雨概率 */}
                <div className="ai-preview-weather-hidden" data-testid="ai-weather-card">
                  {weather !== null && weather.available && weather.weather !== null
                    ? `${weather.weather.temp_max_c}° / ${weather.weather.temp_min_c}° ${weather.weather.weather_text} ${weather.weather.precipitation_probability_pct ?? '—'}%`
                    : ''}
                </div>

                {stops.length < 2 && (
                  <p className="ai-min-stops" role="alert">
                    {aiMessages.minStops}
                  </p>
                )}

                <div className="ai-day-list" data-testid="ai-timeline">
                  {replyDays.map((entry) => (
                    <section className="ai-day-card" key={`day-${entry.day}`}>
                      <header className="ai-day-head">
                        <span className="ai-day-name">Day {entry.day}</span>
                        <span className="ai-day-date">{formatMonthDay(dayDate(entry.day))}</span>
                        <span className="ai-day-theme">{dayThemes(entry.stops)}</span>
                      </header>
                      <ol className="ai-stop-list">
                        {entry.stops.map((stop) => {
                          const index = stops.findIndex((item) => item.order === stop.order);
                          return (
                            <li
                              key={`${stop.name}-${stop.order}`}
                              data-testid="ai-stop"
                              data-name={stop.name}
                              data-indoor={stop.indoor}
                              draggable
                              onDragStart={(event) => onStopDragStart(event, index)}
                              onDragOver={(event) => onStopDragOver(event, index)}
                              onDrop={(event) => onStopDrop(event, index)}
                              onDragEnd={endDrag}
                              className={[
                                'ai-stop-row',
                                stop.resolved ? '' : 'is-unresolved',
                                focusId === `stop-${stop.order}` ? 'is-active' : '',
                                dragIndex === index ? 'is-dragging' : '',
                                dropIndex === index && dragIndex !== null && dragIndex !== index
                                  ? 'is-drop-target'
                                  : '',
                              ]
                                .filter((entry) => entry !== '')
                                .join(' ')}
                            >
                              <span className="ai-drag-handle" title={aiMessages.dragHint} aria-hidden="true">
                                ⠿
                              </span>
                              <span className="ai-stop-chip" aria-hidden="true">
                                {stop.arrival}
                              </span>
                              <div className="ai-stop-main">
                                <div className="ai-stop-head">
                                  <button
                                    type="button"
                                    className="ai-stop-name"
                                    onClick={() => {
                                      setFocusId(`stop-${stop.order}`);
                                      setMapOpen(true);
                                    }}
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
                                  onClick={() => openReplace(index)}
                                >
                                  更换
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  ))}
                </div>

                <div className="ai-route-strip" data-testid="ai-stats">
                  <span className="ai-route-strip-label">{aiMessages.mapTitle}</span>
                  {route === null ? (
                    <span className="ai-route-strip-value">—</span>
                  ) : (
                    <span className="ai-route-strip-value">
                      {aiMessages.statsDistance} {formatDistance(route.distanceMeters)} ·{' '}
                      {aiMessages.statsDuration} {formatDuration(route.durationSeconds)}
                    </span>
                  )}
                  <span className="ai-route-strip-source">
                    {routeLoading ? aiMessages.routeLoading : aiMessages.statsSource}
                  </span>
                  {route?.estimated === true && (
                    <span className="ai-route-strip-estimated">{aiMessages.routeEstimated}</span>
                  )}
                  <Button
                    size="small"
                    type="text"
                    data-testid="ai-map-toggle"
                    onClick={() => setMapOpen(true)}
                  >
                    {aiMessages.openMap}
                  </Button>
                </div>
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
                {resolvedCount(stops) < 2 && (
                  <p className="form-hint">{aiMessages.minRouteStops}</p>
                )}

                {overBudget !== null && (
                  <div className="ai-over-budget" role="alert">
                    <span>{aiMessages.overBudget(overBudget)}</span>
                    <Button size="small" disabled={busy} onClick={() => void generate(true)}>
                      {aiMessages.reduceBudget}
                    </Button>
                  </div>
                )}

                <div className="ai-tip-card">
                  <h4 className="ai-tip-title">{aiMessages.tipsTitle}</h4>
                  <ul className="ai-tip-list" data-testid="ai-tips">
                    {planMeta.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                  {planMeta.packing.length > 0 && (
                    <div className="ai-packing-list" data-testid="ai-packing">
                      {planMeta.packing.map((item) => (
                        <Tag key={item} className="ai-packing-tag">
                          {item}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>

                {/* 既有 E2E 用这两个 testid 断言预算数值，保留为语义节点 */}
                <dl className="ai-budget-card" data-testid="ai-budget-card">
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
                    <dd>{budgetTotal} 元</dd>
                  </div>
                  <span className="ai-budget-note">{aiMessages.budgetNote}</span>
                </dl>
              </div>
            )}

            <footer className="ai-preview-foot">
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
            </footer>
          </Card>

          {generateError !== null && !generating && (
            <Alert
              type="error"
              showIcon
              title={aiErrorMessage(generateError)}
              description={aiMessages.errorHint}
            />
          )}
          {saveError !== null && <Alert type="error" showIcon title={saveError} />}
        </section>
      </div>

      {/* ==================== 历史对话（抽屉） ==================== */}
      <Drawer
        title={aiMessages.historyTitle}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        width={360}
        className="ai-history-drawer"
        destroyOnHidden
      >
        <div className="ai-history-actions">
          <Button
            type="primary"
            block
            disabled={busy}
            onClick={() => {
              setHistoryOpen(false);
              newChat();
            }}
          >
            {aiMessages.newChat}
          </Button>
        </div>
        <ul className="ai-history-list" data-testid="ai-history-list">
          {sessionStore.sessions.map((session) => {
            const active = session.id === activeSessionId;
            const last = session.messages[session.messages.length - 1];
            const preview = last === undefined ? aiMessages.historyEmpty : last.text;
            return (
              <li key={session.id}>
                <button
                  type="button"
                  className={active ? 'ai-history-item is-active' : 'ai-history-item'}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => openSession(session.id)}
                >
                  <span className="ai-history-title">{session.title}</span>
                  <span className="ai-history-preview">{preview}</span>
                  <span className="ai-history-meta">
                    {session.stops.length > 0
                      ? aiMessages.historyStops(session.stops.length)
                      : aiMessages.historyNoPlan}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Drawer>

      {/* ==================== 路线地图（只读查看，不再承担选点） ==================== */}
      <Modal
        open={mapOpen}
        onCancel={() => setMapOpen(false)}
        footer={null}
        width={860}
        title={aiMessages.mapModalTitle}
        className="ai-map-modal"
        destroyOnHidden
      >
        <div className="ai-map-wrap">
          <AmapContainer
            className="ai-map-container"
            lng={center.lng}
            lat={center.lat}
            zoom={11}
            ariaLabel={aiMessages.mapAriaLabel}
            onReady={setMap}
          >
            <RouteLayer
              map={map}
              waypoints={waypoints}
              route={route}
              focusId={focusId}
              onFocus={setFocusId}
              numbers={numbers}
            />
          </AmapContainer>
        </div>
      </Modal>

      {/* ==================== 更换地点（大搜索框 + 地图选点） ==================== */}
      <Modal
        open={replaceIndex !== null}
        onCancel={() => {
          setReplaceIndex(null);
          setReplaceCandidates(null);
        }}
        footer={null}
        width={820}
        title={aiMessages.replaceMapTitle}
        className="ai-map-modal ai-replace-modal"
        destroyOnHidden
      >
        {replaceIndex !== null && stops[replaceIndex] !== undefined && (
          <div className="ai-replace-body">
            <div className="ai-replace-search" data-testid="ai-replace-search">
              <PlaceSearchBox
                inputId={`ai-replace-input-${replaceIndex}`}
                ariaLabel={aiMessages.replace(stops[replaceIndex].name)}
                placeholder={aiMessages.replaceSearchPlaceholder}
                city={form.destination?.name}
                size="large"
                autoFocus
                onPick={onReplacePick(replaceIndex)}
              />
            </div>
            <span className="form-hint">{aiMessages.replaceMapHint}</span>
            <div className="ai-map-wrap">
              <AmapContainer
                className="ai-map-container"
                lng={stops[replaceIndex].lng ?? center.lng}
                lat={stops[replaceIndex].lat ?? center.lat}
                zoom={12}
                ariaLabel={aiMessages.replaceMapTitle}
                onReady={setReplaceMap}
                onMapClick={handleReplaceMapClick}
              >
                <RouteLayer
                  map={replaceMap}
                  waypoints={waypoints}
                  route={route}
                  focusId={focusId}
                  onFocus={setFocusId}
                  numbers={numbers}
                />
                {replaceCandidates !== null && (
                  <div
                    className="ai-map-candidates"
                    data-testid="ai-replace-candidates"
                    role="dialog"
                    aria-label={aiMessages.replaceMapCandidates}
                  >
                    <div className="ai-candidates-head">
                      <span>{aiMessages.replaceMapCandidates}</span>
                      <button
                        type="button"
                        aria-label={aiMessages.closeCandidates}
                        onClick={() => setReplaceCandidates(null)}
                      >
                        ×
                      </button>
                    </div>
                    {replaceLoading ? (
                      <div className="ai-candidates-state" role="status">
                        <Spin size="small" />
                      </div>
                    ) : replaceCandidates.length === 0 ? (
                      <p className="ai-candidates-state">{aiMessages.replaceMapEmpty}</p>
                    ) : (
                      <ul className="ai-candidates-list">
                        {replaceCandidates.map((place) => (
                          <li key={place.id}>
                            <button type="button" onClick={() => onReplacePick(replaceIndex)(place)}>
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
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}