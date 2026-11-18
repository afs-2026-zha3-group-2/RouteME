/**
 * AI 规划页的多会话存储（本机 localStorage，按用户隔离）。
 *
 * <p>页面原来只有一份全局 state：换一个目的地继续聊会把上一条行程覆盖掉，
 * 两个旅行话题互相污染。这里把「一次旅行规划」建模成独立会话，包含对话、
 * 条件、行程与天气；切换会话即切换整份上下文，互不影响。
 *
 * <p>只存本机、不跨设备；解析失败视为没有历史，不半信半疑地恢复。
 */
import type { AiBudget, WeatherForecast } from '../types';
import { defaultPlannerForm, type PlannerFormValues } from './plannerForm';
import type { ResolvedStop } from './poiResolve';

export type PlannerChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  time: string;
  tone: 'default' | 'plan' | 'error';
  /**
   * 方案消息自带的历史快照：
   * 回复气泡原来直接读页面当前 stops/planMeta，导致同一会话里每条「已生成」消息
   * 都渲染成同一份最新方案（看起来像重复回答）。每条方案消息只认自己的快照，
   * 只有最新那条才绑定页面上可交互的实时方案。
   */
  plan?: PlannerPlanSnapshot | null;
};

/** 一条方案消息的快照：只留展示需要的字段，体积远小于整份行程。 */
export type PlannerPlanSnapshot = {
  title: string;
  dayCount: number;
  stops: Array<{ name: string; day: number; arrival: string }>;
};

/** 时间轴景点：day 决定分天展示，order 决定编号（1..n）。 */
export type PlannerStop = ResolvedStop & { day: number };

export type PlannerPlanMeta = {
  title: string;
  tips: string[];
  packing: string[];
  budget: AiBudget;
  dayCount: number;
};

export type PlannerSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  form: PlannerFormValues;
  messages: PlannerChatMessage[];
  planMeta: PlannerPlanMeta | null;
  stops: PlannerStop[];
  weather: WeatherForecast | null;
};

export type PlannerSessionStore = {
  activeId: string;
  sessions: PlannerSession[];
};

const STORAGE_PREFIX = 'routeme.aiPlanner.v1';

export function plannerStorageKey(userId: number): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

let sessionSeq = 0;

/** 会话 id：时间戳 + 自增序号，同一毫秒内连续新建也不会重复。 */
export function newSessionId(now: number = Date.now()): string {
  sessionSeq += 1;
  return `s-${now.toString(36)}-${sessionSeq}`;
}

/** 会话标题：优先目的地，其次第一条用户消息，最后兜底「新的规划」。 */
export function describeSession(
  form: PlannerFormValues,
  messages: PlannerChatMessage[],
): string {
  const destination = form.destination?.name.trim() ?? '';
  if (destination !== '') {
    return destination.replace(/市$/, '');
  }
  const firstUser = messages.find((message) => message.role === 'user');
  if (firstUser !== undefined) {
    const text = firstUser.text.trim();
    return text.length > 18 ? `${text.slice(0, 18)}…` : text;
  }
  return '新的规划';
}

export function createPlannerSession(
  form: PlannerFormValues = defaultPlannerForm(),
  now: number = Date.now(),
): PlannerSession {
  return {
    id: newSessionId(now),
    title: describeSession(form, []),
    createdAt: now,
    updatedAt: now,
    form,
    messages: [],
    planMeta: null,
    stops: [],
    weather: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return null;
  }
  return value as string[];
}

function parsePlace(value: unknown): PlannerFormValues['origin'] {
  if (!isRecord(value)) {
    return null;
  }
  const name = asString(value.name);
  const lng = asNumber(value.lng);
  const lat = asNumber(value.lat);
  if (name === null || lng === null || lat === null) {
    return null;
  }
  return { name, lng, lat };
}

function parseForm(value: unknown): PlannerFormValues | null {
  if (!isRecord(value)) {
    return null;
  }
  const base = defaultPlannerForm();
  const duration = asString(value.duration);
  const pace = asString(value.pace);
  const travelMode = asString(value.travelMode);
  const interests = asStringArray(value.interests);
  if (interests === null) {
    return null;
  }
  return {
    origin: parsePlace(value.origin),
    destination: parsePlace(value.destination),
    date: asString(value.date) ?? base.date,
    duration:
      duration === 'half_day' || duration === 'one_day' || duration === 'two_day'
        ? duration
        : base.duration,
    budgetYuan: asString(value.budgetYuan) ?? '',
    travelMode:
      travelMode === 'transit' || travelMode === 'walking' || travelMode === 'driving'
        ? travelMode
        : base.travelMode,
    interests,
    pace: pace === 'relaxed' || pace === 'moderate' || pace === 'compact' ? pace : base.pace,
  };
}

function parsePlanSnapshot(value: unknown): PlannerPlanSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = asString(value.title);
  const dayCount = asNumber(value.dayCount);
  if (title === null || dayCount === null || !Array.isArray(value.stops)) {
    return null;
  }
  const stops: PlannerPlanSnapshot['stops'] = [];
  for (const entry of value.stops) {
    if (!isRecord(entry)) {
      continue;
    }
    const name = asString(entry.name);
    if (name === null) {
      continue;
    }
    stops.push({
      name,
      day: asNumber(entry.day) ?? 1,
      arrival: asString(entry.arrival) ?? '09:00',
    });
  }
  return { title, dayCount, stops };
}

function parseMessages(value: unknown): PlannerChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const messages: PlannerChatMessage[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const role = entry.role === 'user' ? 'user' : 'assistant';
    const text = asString(entry.text);
    if (text === null) {
      continue;
    }
    const tone = entry.tone === 'plan' || entry.tone === 'error' ? entry.tone : 'default';
    messages.push({
      id: asNumber(entry.id) ?? messages.length + 1,
      role,
      text,
      time: asString(entry.time) ?? '00:00',
      tone,
      // 旧版本存的方案消息没有快照：留 null，渲染层退化为一句话摘要。
      plan: tone === 'plan' ? parsePlanSnapshot(entry.plan) : null,
    });
  }
  return messages;
}

function parseStop(value: unknown): PlannerStop | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = asString(value.name);
  if (name === null) {
    return null;
  }
  const lng = asNumber(value.lng);
  const lat = asNumber(value.lat);
  return {
    name,
    reason: asString(value.reason) ?? '',
    arrival: asString(value.arrival) ?? '09:00',
    stay_minutes: asNumber(value.stay_minutes) ?? 60,
    indoor: value.indoor === true,
    order: asNumber(value.order) ?? 1,
    resolved: value.resolved === true && lng !== null && lat !== null,
    ...(lng !== null && lat !== null ? { lng, lat } : {}),
    ...(asString(value.city) !== null ? { city: asString(value.city) as string } : {}),
    day: asNumber(value.day) ?? 1,
  };
}

function parsePlanMeta(value: unknown): PlannerPlanMeta | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = asString(value.title);
  const tips = asStringArray(value.tips);
  const packing = asStringArray(value.packing);
  const budget = value.budget;
  if (title === null || tips === null || packing === null || !isRecord(budget)) {
    return null;
  }
  const cents = (key: string) => asNumber(budget[key]) ?? 0;
  return {
    title,
    tips,
    packing,
    budget: {
      transport_cents: cents('transport_cents'),
      tickets_cents: cents('tickets_cents'),
      food_cents: cents('food_cents'),
      other_cents: cents('other_cents'),
      total_cents: cents('total_cents'),
    },
    dayCount: asNumber(value.dayCount) ?? 1,
  };
}

function parseSession(value: unknown, now: number): PlannerSession | null {
  if (!isRecord(value)) {
    return null;
  }
  const form = parseForm(value.form);
  if (form === null) {
    return null;
  }
  const messages = parseMessages(value.messages);
  const stops = Array.isArray(value.stops)
    ? value.stops
        .map((entry) => parseStop(entry))
        .filter((entry): entry is PlannerStop => entry !== null)
    : [];
  return {
    id: asString(value.id) ?? newSessionId(now),
    title: asString(value.title) ?? describeSession(form, messages),
    createdAt: asNumber(value.createdAt) ?? now,
    updatedAt: asNumber(value.updatedAt) ?? now,
    form,
    messages,
    planMeta: parsePlanMeta(value.planMeta),
    stops,
    weather: isRecord(value.weather) ? (value.weather as WeatherForecast) : null,
  };
}

/** 解析整个存储；无有效会话时返回 null（由调用方新建空白会话）。 */
export function parseSessionStore(raw: string | null, now: number = Date.now()): PlannerSessionStore | null {
  if (raw === null || raw.trim() === '') {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || !Array.isArray(data.sessions)) {
    return null;
  }
  const sessions = data.sessions
    .map((entry) => parseSession(entry, now))
    .filter((entry): entry is PlannerSession => entry !== null);
  if (sessions.length === 0) {
    return null;
  }
  const requested = asString(data.activeId);
  const activeId =
    requested !== null && sessions.some((session) => session.id === requested)
      ? requested
      : sessions[0].id;
  return { activeId, sessions };
}

export function readSessionStore(
  userId: number,
  storage: Storage | undefined = globalThis.localStorage,
): PlannerSessionStore | null {
  if (storage === undefined) {
    return null;
  }
  try {
    return parseSessionStore(storage.getItem(plannerStorageKey(userId)));
  } catch {
    return null;
  }
}

export function writeSessionStore(
  userId: number,
  store: PlannerSessionStore,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  if (storage === undefined) {
    return;
  }
  try {
    storage.setItem(plannerStorageKey(userId), JSON.stringify(store));
  } catch {
    // 隐私模式 / 配额满：历史只是便利功能，失败不阻塞规划。
  }
}

/** 一颗浏览器里最多保留的历史会话数：再多也没人在抽屉里翻。 */
export const MAX_PLANNER_SESSIONS = 20;

/** 用一份会话替换 store 里的同 id 项；不存在则插到最前面。 */
export function upsertSession(
  store: PlannerSessionStore,
  session: PlannerSession,
): PlannerSessionStore {
  const exists = store.sessions.some((entry) => entry.id === session.id);
  const merged = exists
    ? store.sessions.map((entry) => (entry.id === session.id ? session : entry))
    : [session, ...store.sessions];
  // 抽屉按最近使用排序；超过上限丢掉最旧的（当前激活的一定保留）。
  const sessions = [...merged]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_PLANNER_SESSIONS);
  const activeId = sessions.some((entry) => entry.id === session.id)
    ? session.id
    : sessions[0].id;
  return { activeId: store.activeId === session.id ? activeId : store.activeId, sessions };
}

/** 读取用户历史；没有历史时新建一份空白会话，保证 activeId 永远有效。 */
export function loadSessionStore(
  userId: number,
  now: number = Date.now(),
  storage: Storage | undefined = globalThis.localStorage,
): PlannerSessionStore {
  const stored = readSessionStore(userId, storage);
  if (stored !== null) {
    return stored;
  }
  const session = createPlannerSession(defaultPlannerForm(), now);
  return { activeId: session.id, sessions: [session] };
}