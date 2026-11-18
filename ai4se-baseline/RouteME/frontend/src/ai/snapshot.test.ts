import { describe, expect, it } from 'vitest';
import type { AiBudget, AiItinerarySnapshot, RoutePlan, WeatherForecast } from '../types';
import type { PlannerFormValues } from './plannerForm';
import type { ResolvedStop } from './poiResolve';
import { buildSnapshot, toTripPrefill } from './snapshot';

const form: PlannerFormValues = {
  origin: { name: '广州南站', lng: 113.269, lat: 22.989 },
  destination: { name: '广州市', lng: 113.264, lat: 23.129 },
  date: '2026-11-21',
  duration: 'one_day',
  budgetYuan: '500',
  travelMode: 'transit',
  interests: ['美食', '摄影', 'City Walk'],
  pace: 'moderate',
};

const stops: ResolvedStop[] = [
  {
    name: '广州塔',
    reason: '城市地标',
    arrival: '09:00',
    stay_minutes: 120,
    indoor: false,
    order: 1,
    lng: 113.3245,
    lat: 23.1064,
    resolved: true,
  },
  {
    name: '海心沙',
    reason: '江景开阔',
    arrival: '11:30',
    stay_minutes: 60,
    indoor: false,
    order: 2,
    lng: 113.3217,
    lat: 23.1104,
    resolved: true,
  },
];

const route: RoutePlan = {
  mode: 'transit',
  distanceMeters: 8200,
  durationSeconds: 2700,
  path: [
    [113.3245, 23.1064],
    [113.3217, 23.1104],
  ],
  legs: [{ fromId: 'poi-广州塔', toId: 'poi-海心沙', distanceMeters: 8200, durationSeconds: 2700 }],
};

const weather: WeatherForecast = {
  date: '2026-11-21',
  destination_code: '440100',
  city: '广州市',
  lng: 113.264,
  lat: 23.129,
  available: true,
  reason: null,
  weather: {
    weather_code: 1,
    weather_text: '多云',
    temp_max_c: 24,
    temp_min_c: 17,
    precipitation_probability_pct: 20,
    precipitation_mm: 0,
    wind_speed_kmh: 12.5,
    uv_index: 6,
  },
  reminders: [],
  source: 'open-meteo',
};

const aiBudget: AiBudget = {
  transport_cents: 8000,
  tickets_cents: 15000,
  food_cents: 18000,
  other_cents: 5000,
  total_cents: 46000,
};

const input = {
  form,
  stops,
  route,
  weather,
  tips: ['当天紫外线较强，注意防晒'],
  packing: ['防晒霜', '帽子', '饮用水'],
  aiBudget,
};

describe('buildSnapshot', () => {
  it('captures every field required by the snapshot contract', () => {
    const snapshot = buildSnapshot(input);

    expect(snapshot.origin).toEqual(form.origin);
    expect(snapshot.destination).toEqual(form.destination);
    expect(snapshot.date).toBe('2026-11-21');
    expect(snapshot.duration).toBe('one_day');
    expect(snapshot.travel_mode).toBe('transit');
    expect(snapshot.interests).toEqual(['美食', '摄影', 'City Walk']);
    expect(snapshot.pace).toBe('moderate');
    expect(snapshot.budget_cents).toBe(50000);
    expect(snapshot.stops).toEqual([
      {
        name: '广州塔',
        lng: 113.3245,
        lat: 23.1064,
        order: 1,
        reason: '城市地标',
        arrival: '09:00',
        stay_minutes: 120,
        indoor: false,
        resolved: true,
      },
      {
        name: '海心沙',
        lng: 113.3217,
        lat: 23.1104,
        order: 2,
        reason: '江景开阔',
        arrival: '11:30',
        stay_minutes: 60,
        indoor: false,
        resolved: true,
      },
    ]);
    expect(snapshot.route).toEqual({
      mode: 'transit',
      distance_meters: 8200,
      duration_seconds: 2700,
      legs: [
        { from_id: 'poi-广州塔', to_id: 'poi-海心沙', distance_meters: 8200, duration_seconds: 2700 },
      ],
    });
    expect(snapshot.weather).toEqual(weather);
    expect(snapshot.tips).toEqual(input.tips);
    expect(snapshot.packing).toEqual(input.packing);
    expect(snapshot.ai_budget).toEqual(aiBudget);
  });

  it('keeps route and weather nullable when services failed', () => {
    const snapshot = buildSnapshot({ ...input, route: null, weather: null });
    expect(snapshot.route).toBeNull();
    expect(snapshot.weather).toBeNull();
  });
});

describe('toTripPrefill', () => {
  const snapshot: AiItinerarySnapshot = buildSnapshot(input);

  it('prefills the publish form from the snapshot', () => {
    const prefill = toTripPrefill(snapshot);

    expect(prefill.title).toBe('广州市 1 日游 · AI 推荐');
    expect(prefill.destinationCode).toBe('440100');
    expect(prefill.startDate).toBe('2026-11-21');
    expect(prefill.endDate).toBe('2026-11-21');
    expect(prefill.stops).toEqual(['广州塔', '海心沙']);
    expect(prefill.tags).toEqual(['美食', '摄影']);
    expect(prefill.budgetMin).toBe('460');
    expect(prefill.budgetMax).toBe('460');
    // 参考稿不再使用「AI 估算」标识：预填文案只写「参考估算」。
    expect(prefill.note).toContain('参考估算');
    expect(prefill.capacity).toBe('4');
  });

  it('truncates the title to the publish limit', () => {
    const longName = '超长目的地名称'.repeat(8);
    const prefill = toTripPrefill({
      ...snapshot,
      destination: { ...snapshot.destination, name: longName },
    });
    expect(prefill.title.length).toBeLessThanOrEqual(40);
  });

  it('leaves destinationCode empty when the name is not in the gazetteer', () => {
    const prefill = toTripPrefill({
      ...snapshot,
      destination: { ...snapshot.destination, name: '神秘城市' },
    });
    expect(prefill.destinationCode).toBe('');
  });

  it('labels half-day and two-day plans', () => {
    expect(toTripPrefill({ ...snapshot, duration: 'half_day' }).title).toContain('半日游');
    expect(toTripPrefill({ ...snapshot, duration: 'two_day' }).title).toContain('2 日游');
  });
});