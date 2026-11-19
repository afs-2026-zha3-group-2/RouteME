/**
 * 页面状态 → 快照请求体（POST /api/ai/itineraries）与发布页预填值。
 * 不读 DOM、不发请求（design §4.2 / §4.4）。
 */
import { AREA_OPTIONS } from '../area/areaOptions';
import { INTEREST_TAGS, MAX_STOPS, MAX_TAGS, MAX_TITLE_LENGTH } from '../trips/tripOptions';
import type {
  AiBudget,
  AiItinerarySnapshot,
  AiSnapshotRoute,
  AiSnapshotStop,
  AiTravelMode,
  RoutePlan,
  WeatherForecast,
} from '../types';
import { aiMessages } from './aiMessages';
import { centsToYuan, sumBudgetCents } from './budgetMath';
import type { ResolvedStop } from './poiResolve';
import { yuanToCents, type PlannerFormValues } from './plannerForm';

export type SnapshotInput = {
  form: PlannerFormValues;
  stops: ResolvedStop[];
  route: RoutePlan | null;
  weather: WeatherForecast | null;
  tips: string[];
  packing: string[];
  aiBudget: AiBudget | null;
};

/** 完整快照：route 丢弃地图折线（path），只存距离 / 时间 / 分段；服务失败保留 null。 */
export function buildSnapshot(input: SnapshotInput): AiItinerarySnapshot {
  const { form, route } = input;
  if (form.origin === null || form.destination === null) {
    throw new Error('请先选择出发地和目的地');
  }
  const stops: AiSnapshotStop[] = input.stops.map((stop) => ({
    name: stop.name,
    lng: stop.lng,
    lat: stop.lat,
    order: stop.order,
    reason: stop.reason,
    arrival: stop.arrival,
    stay_minutes: stop.stay_minutes,
    indoor: stop.indoor,
    resolved: stop.resolved,
  }));
  // 规划页只产出 transit / walking / driving；bicycling 不进入 AI 快照。
  const snapshotRoute: AiSnapshotRoute | null =
    route === null
      ? null
      : {
          mode: route.mode as AiTravelMode,
          distance_meters: route.distanceMeters,
          duration_seconds: route.durationSeconds,
          legs: route.legs.map((leg) => ({
            from_id: leg.fromId,
            to_id: leg.toId,
            distance_meters: leg.distanceMeters,
            duration_seconds: leg.durationSeconds,
          })),
        };
  return {
    origin: form.origin,
    destination: form.destination,
    date: form.date,
    duration: form.duration,
    travel_mode: form.travelMode,
    interests: [...form.interests],
    pace: form.pace,
    budget_cents: yuanToCents(form.budgetYuan),
    stops,
    route: snapshotRoute,
    weather: input.weather,
    tips: [...input.tips],
    packing: [...input.packing],
    ai_budget: input.aiBudget,
  };
}

/** 发布页预填值（TripCreatePage 表单口径：预算 / 人数为字符串）。 */
export type TripPrefill = {
  title: string;
  departureCode: string;
  destinationCode: string;
  startDate: string;
  endDate: string;
  stops: string[];
  tags: string[];
  budgetMin: string;
  budgetMax: string;
  note: string;
  capacity: string;
};

/** 目的地名 → 行政区划代码（含直辖市口径与去「市」简称）；查不到留空由用户手选。 */
const cityCodeByName = new Map<string, string>();
for (const province of AREA_OPTIONS) {
  for (const city of province.children ?? []) {
    cityCodeByName.set(city.label, city.value);
    const short = city.label.replace(/市$/, '');
    if (!cityCodeByName.has(short)) {
      cityCodeByName.set(short, city.value);
    }
  }
}

/**
 * 地点名 → 城市代码：先精确匹配，再按「包含城市名」取最长匹配。
 * 出发地常是「广州南站」「上海虹桥站」这类站点名，需容忍城市名前后缀。
 */
function cityCodeOfPlaceName(name: string): string {
  const raw = name.trim();
  const exact = cityCodeByName.get(raw);
  if (exact !== undefined) {
    return exact;
  }
  let best: { code: string; length: number } | null = null;
  for (const [label, code] of cityCodeByName) {
    if (label.length < 2 || !raw.includes(label)) {
      continue;
    }
    if (best === null || label.length > best.length) {
      best = { code, length: label.length };
    }
  }
  return best?.code ?? '';
}

export function toTripPrefill(snapshot: AiItinerarySnapshot): TripPrefill {
  const durationLabel = aiMessages.durationLabels[snapshot.duration];
  const title = `${snapshot.destination.name} ${durationLabel} · ${aiMessages.sourceBadge}`.slice(
    0,
    MAX_TITLE_LENGTH,
  );
  const tags = snapshot.interests
    .filter((tag) => (INTEREST_TAGS as readonly string[]).includes(tag))
    .slice(0, MAX_TAGS);
  const totalYuan =
    snapshot.ai_budget === null ? null : centsToYuan(sumBudgetCents(snapshot.ai_budget));
  const budget = totalYuan === null ? '' : String(totalYuan);

  const noteParts: string[] = ['来自 AI 推荐行程。'];
  if (snapshot.ai_budget !== null) {
    const estimate = snapshot.ai_budget;
    noteParts.push(
      `预算为${aiMessages.budgetReference}：交通 ${centsToYuan(estimate.transport_cents)} 元 / ` +
        `门票 ${centsToYuan(estimate.tickets_cents)} 元 / 餐饮 ${centsToYuan(estimate.food_cents)} 元 / ` +
        `其他 ${centsToYuan(estimate.other_cents)} 元，合计 ${centsToYuan(sumBudgetCents(estimate))} 元` +
        '（无真实价格来源）。',
    );
  }
  if (snapshot.weather !== null && snapshot.weather.weather !== null) {
    const daily = snapshot.weather.weather;
    noteParts.push(
      `天气（${snapshot.weather.source}）：${daily.weather_text} ${daily.temp_min_c}–${daily.temp_max_c}°C，` +
        `降雨概率 ${daily.precipitation_probability_pct ?? '—'}%。`,
    );
  }
  if (snapshot.tips.length > 0) {
    noteParts.push(`出行建议：${snapshot.tips.join('；')}。`);
  }

  return {
    title,
    departureCode: cityCodeOfPlaceName(snapshot.origin.name),
    destinationCode: cityCodeByName.get(snapshot.destination.name) ?? '',
    startDate: snapshot.date,
    endDate: snapshot.date,
    stops: snapshot.stops.map((stop) => stop.name).slice(0, MAX_STOPS),
    tags,
    budgetMin: budget,
    budgetMax: budget,
    note: noteParts.join('\n'),
    capacity: '4',
  };
}