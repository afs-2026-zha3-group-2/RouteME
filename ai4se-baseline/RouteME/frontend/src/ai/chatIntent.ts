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

/** 自然语言 → 规划条件；未提到的字段保持 null，调用方按需合并。 */
export function parsePlanIntent(text: string): PlanIntent {
  return {
    destinationName: findCityInText(text),
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
    text: '帮我规划一个珠海两天一夜的行程，偏向美食和拍照，预算在 500 元以内。',
  },
  {
    id: 'weekend-around',
    label: '周末周边游',
    text: '推荐一个适合周末的广州周边游，轻松一点，一天来回。',
  },
  {
    id: 'food-tour',
    label: '美食之旅',
    text: '帮我规划一条佛山美食之旅，一天，公共交通出行。',
  },
  {
    id: 'photo-walk',
    label: '拍照打卡',
    text: '想拍城市夜景和海岸线，帮我规划深圳一天的拍照打卡路线。',
  },
  {
    id: 'graduation',
    label: '毕业旅行',
    text: '帮我们规划一个毕业旅行，两个人去厦门玩两天一夜，预算 800 元。',
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