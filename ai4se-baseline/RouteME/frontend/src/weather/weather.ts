/**
 * 天气卡的纯逻辑：状态派生、日期与温度文案、字段行、提醒色调。
 *
 * 这里不判断任何天气阈值——阈值与提醒文案都由后端给出，前端只负责展示，
 * 保证发布页与详情页的口径完全一致。
 */

import type { WeatherForecast } from '../types';

export type WeatherCardState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; forecast: WeatherForecast }
  | { kind: 'unavailable'; forecast: WeatherForecast }
  | { kind: 'error' };

export type WeatherFact = {
  key: 'rainProbability' | 'precipitation' | 'wind' | 'uv';
  label: string;
  value: string;
};

type WeatherStateInput = {
  destinationCode: string;
  date: string;
  loading: boolean;
  error: boolean;
  forecast: WeatherForecast | null;
};

/**
 * 五态派生。优先级：缺参 → 失败 → 加载 → 可用 / 不可用 → 未就绪。
 * 加载中不返回旧数据，避免「加载中仍显示上一个目的地天气」。
 */
export function toCardState(input: WeatherStateInput): WeatherCardState {
  if (input.destinationCode.trim() === '' || input.date.trim() === '') {
    return { kind: 'idle' };
  }
  if (input.error) {
    return { kind: 'error' };
  }
  if (input.loading) {
    return { kind: 'loading' };
  }
  if (input.forecast === null) {
    return { kind: 'idle' };
  }
  return input.forecast.available
    ? { kind: 'ready', forecast: input.forecast }
    : { kind: 'unavailable', forecast: input.forecast };
}

/** 温度区间文案：`17–24°C`；不在文案中加入任何推算值。 */
export function temperatureLabel(forecast: WeatherForecast): string {
  if (forecast.weather === null) {
    return '';
  }
  const min = Math.round(forecast.weather.temp_min_c);
  const max = Math.round(forecast.weather.temp_max_c);
  return `${min}–${max}°C`;
}

/** `2026-11-21` → `11 月 21 日（首日）`；按字符串解析，避免时区把日期挪一天。 */
export function dateLabel(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) {
    return isoDate;
  }
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return isoDate;
  }
  return `${month} 月 ${day} 日（首日）`;
}

/** 字段行：上游缺省的项直接跳过，不用 0 或占位符代替。 */
export function weatherFacts(forecast: WeatherForecast, labels: {
  rainProbability: string;
  precipitation: string;
  wind: string;
  uv: string;
}): WeatherFact[] {
  const weather = forecast.weather;
  if (weather === null) {
    return [];
  }
  const facts: WeatherFact[] = [];
  if (weather.precipitation_probability_pct !== null) {
    facts.push({
      key: 'rainProbability',
      label: labels.rainProbability,
      value: `${weather.precipitation_probability_pct}%`,
    });
  }
  if (weather.precipitation_mm !== null) {
    facts.push({
      key: 'precipitation',
      label: labels.precipitation,
      value: `${weather.precipitation_mm} mm`,
    });
  }
  if (weather.wind_speed_kmh !== null) {
    facts.push({ key: 'wind', label: labels.wind, value: `${weather.wind_speed_kmh} km/h` });
  }
  if (weather.uv_index !== null) {
    facts.push({ key: 'uv', label: labels.uv, value: String(weather.uv_index) });
  }
  return facts;
}

export type ReminderTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

/** 提醒类别 → 色调；未知类别回落为 neutral。 */
export function reminderTone(code: string): ReminderTone {
  switch (code) {
    case 'rain':
      return 'info';
    case 'heat':
      return 'danger';
    case 'uv':
      return 'warning';
    case 'cold':
      return 'info';
    case 'temperature_gap':
      return 'warning';
    case 'wind':
      return 'danger';
    case 'calm':
      return 'success';
    default:
      return 'neutral';
  }
}