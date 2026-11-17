import { describe, expect, it } from 'vitest';
import type { WeatherForecast } from '../types';
import {
  dateLabel,
  reminderTone,
  temperatureLabel,
  toCardState,
  weatherFacts,
} from './weather';
import { reminderLabel } from './messages';

const labels = {
  rainProbability: '降雨概率',
  precipitation: '降水量',
  wind: '风速',
  uv: '紫外线',
};

function forecast(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
  return {
    date: '2026-11-21',
    destination_code: '440100',
    city: '广州市',
    lng: 113.2644,
    lat: 23.1291,
    available: true,
    reason: null,
    weather: {
      weather_code: 61,
      weather_text: '小雨',
      temp_max_c: 24.4,
      temp_min_c: 17.2,
      precipitation_probability_pct: 80,
      precipitation_mm: 5.2,
      wind_speed_kmh: 18,
      uv_index: 3,
    },
    reminders: [{ code: 'rain', text: '降雨概率 80%，记得带伞。' }],
    source: 'open-meteo',
    ...overrides,
  };
}

describe('toCardState', () => {
  const base = { destinationCode: '440100', date: '2026-11-21', loading: false, error: false };

  it('returns idle when destination or date is missing', () => {
    expect(toCardState({ ...base, destinationCode: '', forecast: forecast() }).kind).toBe('idle');
    expect(toCardState({ ...base, date: '', forecast: forecast() }).kind).toBe('idle');
  });

  it('returns loading without exposing a previous forecast', () => {
    expect(toCardState({ ...base, loading: true, forecast: forecast() }).kind).toBe('loading');
  });

  it('returns error before any data', () => {
    expect(toCardState({ ...base, error: true, forecast: null }).kind).toBe('error');
  });

  it('returns ready for available weather', () => {
    expect(toCardState({ ...base, forecast: forecast() }).kind).toBe('ready');
  });

  it('returns unavailable when the upstream marks the date out of range', () => {
    const state = toCardState({
      ...base,
      forecast: forecast({ available: false, reason: 'OUT_OF_RANGE', weather: null, reminders: [] }),
    });
    expect(state.kind).toBe('unavailable');
  });
});

describe('temperatureLabel', () => {
  it('rounds both bounds and keeps the min-max order', () => {
    expect(temperatureLabel(forecast())).toBe('17–24°C');
  });

  it('returns an empty label when weather is missing', () => {
    expect(temperatureLabel(forecast({ weather: null }))).toBe('');
  });
});

describe('dateLabel', () => {
  it('formats an ISO date without shifting the day', () => {
    expect(dateLabel('2026-11-21')).toBe('11 月 21 日（首日）');
    expect(dateLabel('2026-01-05')).toBe('1 月 5 日（首日）');
  });

  it('falls back to the raw value for unexpected input', () => {
    expect(dateLabel('not-a-date')).toBe('not-a-date');
  });
});

describe('weatherFacts', () => {
  it('lists every available fact in a stable order', () => {
    const facts = weatherFacts(forecast(), labels);
    expect(facts.map((fact) => fact.key)).toEqual(['rainProbability', 'precipitation', 'wind', 'uv']);
    expect(facts.map((fact) => fact.value)).toEqual(['80%', '5.2 mm', '18 km/h', '3']);
  });

  it('skips missing upstream values instead of showing zero', () => {
    const facts = weatherFacts(
      forecast({
        weather: {
          weather_code: 0,
          weather_text: '晴',
          temp_max_c: 20,
          temp_min_c: 15,
          precipitation_probability_pct: null,
          precipitation_mm: null,
          wind_speed_kmh: null,
          uv_index: null,
        },
      }),
      labels,
    );
    expect(facts).toEqual([]);
  });
});

describe('reminderTone and reminderLabel', () => {
  it('maps every known reminder code', () => {
    expect(reminderTone('rain')).toBe('info');
    expect(reminderTone('heat')).toBe('danger');
    expect(reminderTone('uv')).toBe('warning');
    expect(reminderTone('cold')).toBe('info');
    expect(reminderTone('temperature_gap')).toBe('warning');
    expect(reminderTone('wind')).toBe('danger');
    expect(reminderTone('calm')).toBe('success');
  });

  it('falls back to neutral for unknown codes', () => {
    expect(reminderTone('hail')).toBe('neutral');
    expect(reminderLabel('hail')).toBe('提醒');
  });

  it('labels known codes in Chinese', () => {
    expect(reminderLabel('rain')).toBe('雨');
    expect(reminderLabel('temperature_gap')).toBe('温差');
  });
});