/**
 * AI 对话式规划：自然语言 → 规划条件（纯函数，不读 DOM、不发请求）。
 *
 * 页面只负责把解析结果合并进 `PlannerFormValues`；目的地名称仍需页面用高德
 * 地理编码换成真实坐标（AI 不得虚构坐标，见 add-ai-itinerary AC6）。
 */
import { AREA_OPTIONS } from '../area/areaOptions';
import type { AiDuration, AiPace, AiTravelMode } from '../types';
import type { PlannerFormValues } from './plannerForm';

export type PlanIntent = {
  /** 文本中出现的城市名（离线地名库口径，未带「市」后缀）。 */
  destinationName: string | null;
  /** 「从 X 出发」里的出发地名称，仍需页面用高德换成坐标。 */
  originName: string | null;
  /** 文本里提到的旅行日期（yyyy-MM-dd）；未提到时为 null（表单默认今天）。 */
  date: string | null;
  duration: AiDuration | null;
  /** 元；`''` 表示文本里没有预算。保留字符串口径与表单一致。 */
  budgetYuan: string | null;
  pace: AiPace | null;
  travelMode: AiTravelMode | null;
  interests: string[];
};

/** 关键词 → 兴趣标签：命中即写入 interests，去重保序。 */
const INTEREST_KEYWORDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/美食|小吃|吃/, '美食'],
  [/拍照|摄影|出片/, '摄影'],
  [/city\s*walk|城市漫步|散步/i, 'City Walk'],
  [/自然|山野|海边|海岛|公园/, '自然'],
  [/历史|人文|古镇|古迹/, '历史'],
  [/购物|逛街|商场/, '购物'],
  [/艺术|展览|美术馆|博物馆/, '艺术'],
  [/夜景|日落|日出/, '夜景'],
  [/徒步|爬山/, '徒步'],
  [/露营/, '露营'],
];

const BUDGET_PATTERNS: readonly RegExp[] = [
  /预算(?:在|是|为)?\s*(\d{1,5})\s*(?:元|块)/,
  /(\d{1,5})\s*(?:元|块)\s*(?:以内|以下|左右|预算)/,
  /不超过\s*(\d{1,5})\s*(?:元|块)/,
  /预算\s*(\d{1,5})/,
];

/** 目的地候选名：全国市级行政区，带「市」与不带「市」两种写法都收。 */
const CITY_ALIASES = new Set<string>();
for (const province of AREA_OPTIONS) {
  for (const city of province.children ?? []) {
    const name = city.label.trim();
    // 直辖市在 AREA_OPTIONS 里城市层与省级同名，保留原样即可。
    CITY_ALIASES.add(name);
    const short = name.replace(/市$/, '');
    if (short !== '') {
      CITY_ALIASES.add(short);
    }
  }
}

/** 城市名按长度倒序，保证「张家界」不会被「张家」类短名抢先命中。 */
const SORTED_CITIES = [...CITY_ALIASES].sort((left, right) => right.length - left.length);

function parseDuration(text: string): AiDuration | null {
  if (/两天一夜|两日|2\s*天|二日|周末/.test(text)) {
    return 'two_day';
  }
  if (/半天|半日|一下午/.test(text)) {
    return 'half_day';
  }
  if (/一天|一日|1\s*天|当日往返/.test(text)) {
    return 'one_day';
  }
  return null;
}

function parseBudget(text: string): string | null {
  for (const pattern of BUDGET_PATTERNS) {
    const found = pattern.exec(text);
    if (found !== null) {
      return String(Number(found[1]));
    }
  }
  return null;
}

function parsePace(text: string): AiPace | null {
  if (/轻松|宽松|慢节奏|不赶/.test(text)) {
    return 'relaxed';
  }
  if (/紧凑|赶一点|多打卡|高效/.test(text)) {
    return 'compact';
  }
  if (/适中|正常节奏/.test(text)) {
    return 'moderate';
  }
  return null;
}

function parseTravelMode(text: string): AiTravelMode | null {
  if (/自驾|开车/.test(text)) {
    return 'driving';
  }
  if (/步行|走路/.test(text)) {
    return 'walking';
  }
  if (/公共交通|公交|地铁|打车|高铁/.test(text)) {
    return 'transit';
  }
  return null;
}

function parseInterests(text: string): string[] {
  const found: string[] = [];
  for (const [pattern, label] of INTEREST_KEYWORDS) {
    if (pattern.test(text) && !found.includes(label)) {
      found.push(label);
    }
  }
  return found;
}

/** 文本里出现的第一个城市名；同长度取先出现的位置。 */
export function findCityInText(text: string): string | null {
  let best: { city: string; index: number } | null = null;
  for (const city of SORTED_CITIES) {
    const index = text.indexOf(city);
    if (index === -1) {
      continue;
    }
    if (best === null || index < best.index) {
      best = { city, index };
    }
  }
  return best === null ? null : best.city;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 「去/到/前往…」后面的城市：区分「从北京出发去天津」里的出发地与目的地。 */
function findCityAfterDirection(text: string): string | null {
  let best: { city: string; index: number } | null = null;
  for (const city of SORTED_CITIES) {
    const pattern = new RegExp(
      `(?:去|到|前往|飞往|抵达|目的地(?:是|定在)?)[^，,。；;、\\s]{0,4}?${escapeRegExp(city)}`,
    );
    const match = pattern.exec(text);
    if (match === null) {
      continue;
    }
    if (best === null || match.index < best.index) {
      best = { city, index: match.index };
    }
  }
  return best === null ? null : best.city;
}

/**
 * 文本里的目的地：先看「去/到/前往」短语，再剔除「从 X 出发」片段后找城市。
 * 否则「从北京出发去天津」会把出发地北京误当成目的地。
 */
function findDestinationInText(text: string): string | null {
  const afterDirection = findCityAfterDirection(text);
  if (afterDirection !== null) {
    return afterDirection;
  }
  const withoutOrigin = text.replace(
    /(?:从|由|在)\s*[^，,。；;、\s]{2,12}?\s*(?:出发|开始|启程|走|出发地)/g,
    '',
  );
  return findCityInText(withoutOrigin) ?? findCityInText(text);
}

/** 本地日期 yyyy-MM-dd：不用 toISOString，避免 UTC 偏移把日期推前一天。 */
function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
  天: 0,
};

/**
 * 文本里的出行日期 → yyyy-MM-dd。
 *
 * <p>支持：今天 / 明天 / 后天 / 大后天、N 天后、下周X、本周X、M月D日、YYYY-MM-DD。
 * 解析不到返回 null（表单默认今天），绝不猜一个具体日期。
 */
export function parseDateInText(text: string, now: Date = new Date()): string | null {
  const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso !== null) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date);
  }
  const monthDay = /(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/.exec(text);
  if (monthDay !== null) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      // 今年该日期已过时按今天算：行程不能排到过去，但顺延到明年也不像用户的本意。
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const candidate = new Date(now.getFullYear(), month - 1, day);
      return toIsoDate(candidate < today ? today : candidate);
    }
    return null;
  }
  if (/大后天/.test(text)) {
    return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3));
  }
  if (/后天/.test(text)) {
    return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2));
  }
  if (/明天|明日/.test(text)) {
    return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  }
  if (/今天|今日/.test(text)) {
    return toIsoDate(now);
  }
  const daysLater = /(\d{1,2})\s*天后/.exec(text);
  if (daysLater !== null) {
    const days = Number(daysLater[1]);
    if (days > 0 && days <= 60) {
      return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
    }
  }
  // 「本周X / 下周X」按星期几推算；「周末」按最近的周六算。
  const weekday = /(本周|这周|下周|星期|礼拜|周)([一二三四五六日天])/.exec(text);
  if (weekday !== null) {
    const target = WEEKDAY_INDEX[weekday[2]];
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const delta = (target - today.getDay() + 7) % 7 + (weekday[1] === '下周' ? 7 : 0);
    return toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta));
  }
  if (/周末/.test(text)) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const delta = (6 - today.getDay() + 7) % 7;
    return toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta));
  }
  return null;
}

/** 「从 X 出发 / 由 X 出发」里的出发地；拿不到就返回 null（沿用已有出发地）。 */
export function parseOriginName(text: string): string | null {
  const found = /(?:从|由|在)\s*([^\s，,。；;、]{2,12}?)\s*(?:出发|开始|启程|走|出发地)/.exec(text);
  return found === null ? null : found[1];
}

/** 自然语言 → 规划条件；未提到的字段保持 null，调用方按需合并。 */
export function parsePlanIntent(text: string, now: Date = new Date()): PlanIntent {
  return {
    destinationName: findDestinationInText(text),
    originName: parseOriginName(text),
    date: parseDateInText(text, now),
    duration: parseDuration(text),
    budgetYuan: parseBudget(text),
    pace: parsePace(text),
    travelMode: parseTravelMode(text),
    interests: parseInterests(text),
  };
}

/** 条件里是否有任何可用信息（目的地在页面上解析坐标，故不计入）。 */
export function intentHasCondition(intent: PlanIntent): boolean {
  return (
    intent.destinationName !== null ||
    intent.originName !== null ||
    intent.date !== null ||
    intent.duration !== null ||
    intent.budgetYuan !== null ||
    intent.pace !== null ||
    intent.travelMode !== null ||
    intent.interests.length > 0
  );
}

/** 把解析结果合并到表单：只覆盖文本明确提到的字段，兴趣取并集。 */
export function applyIntent(
  form: PlannerFormValues,
  intent: PlanIntent,
  destination: PlannerFormValues['destination'] = null,
): PlannerFormValues {
  const interests =
    intent.interests.length === 0
      ? form.interests
      : [...form.interests, ...intent.interests.filter((item) => !form.interests.includes(item))];
  return {
    ...form,
    destination: intent.destinationName === null ? form.destination : (destination ?? form.destination),
    date: intent.date ?? form.date,
    duration: intent.duration ?? form.duration,
    budgetYuan: intent.budgetYuan ?? form.budgetYuan,
    pace: intent.pace ?? form.pace,
    travelMode: intent.travelMode ?? form.travelMode,
    interests,
  };
}

export type PlannerSuggestion = {
  id: string;
  label: string;
  text: string;
};

/** 欢迎语的「试试这些灵感」胶囊：点击即发送对应文本（参考稿 v3）。 */
export const PLANNER_INSPIRATIONS: readonly PlannerSuggestion[] = [
  {
    id: 'zhuhai-two-day',
    label: '珠海两天一夜',
    text: '从广州出发，帮我规划一个珠海两天一夜的行程，偏向美食和拍照，预算在 500 元以内。',
  },
  {
    id: 'weekend-around',
    label: '周末周边游',
    text: '从深圳出发，推荐一个适合周末的广州周边游，轻松一点，一天来回。',
  },
  {
    id: 'food-tour',
    label: '美食之旅',
    text: '从广州出发，帮我规划一条佛山美食之旅，一天，公共交通出行。',
  },
  {
    id: 'photo-walk',
    label: '拍照打卡',
    text: '从广州出发，想拍城市夜景和海岸线，帮我规划深圳一天的拍照打卡路线。',
  },
  {
    id: 'graduation',
    label: '毕业旅行',
    text: '从广州出发，帮我们规划一个毕业旅行，两个人去厦门玩两天一夜，预算 800 元。',
  },
];

/** 兼容旧引用。 */
export const PLANNER_SUGGESTIONS = PLANNER_INSPIRATIONS;

export type QuickAction = {
  id: string;
  label: string;
};
/** 输入框下方的高频动作（参考稿 v3 的快捷胶囊）。 */
export const PLANNER_QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'more-stops', label: '+ 增加小众景点' },
  { id: 'family', label: '+ 换成亲子路线' },
  { id: 'compact', label: '+ 更紧凑的行程' },
  { id: 'export', label: '+ 导出行程' },
];