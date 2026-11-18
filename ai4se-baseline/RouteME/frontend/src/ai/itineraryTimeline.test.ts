import { describe, expect, it } from 'vitest';
import {
  DAY_START_MINUTES,
  formatClock,
  moveStopTo,
  parseClock,
  retimeStops,
} from './itineraryTimeline';
import type { PlannerStop } from './plannerSession';

const mk = (name: string, day: number, arrival: string, stay = 60): PlannerStop => ({
  name,
  reason: `${name}理由`,
  arrival,
  stay_minutes: stay,
  indoor: false,
  order: 1,
  resolved: true,
  lng: 113.3,
  lat: 23.1,
  day,
});

describe('parseClock / formatClock', () => {
  it('parses HH:mm and rejects malformed input', () => {
    expect(parseClock('09:30')).toBe(570);
    expect(parseClock('9:05')).toBe(545);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('abc')).toBeNull();
  });

  it('formats minutes and clamps the day boundary', () => {
    expect(formatClock(DAY_START_MINUTES)).toBe('09:00');
    expect(formatClock(9 * 60 + 5)).toBe('09:05');
    expect(formatClock(30 * 60)).toBe('23:59');
  });
});

describe('retimeStops', () => {
  it('restarts each day at 09:00 and adds stay + transfer gap', () => {
    const next = retimeStops([
      mk('A', 1, '11:00', 60),
      mk('B', 1, '12:30', 30),
      mk('C', 2, '15:00', 90),
    ]);
    expect(next.map((stop) => stop.arrival)).toEqual(['09:00', '10:20', '09:00']);
  });
});

describe('moveStopTo', () => {
  it('moves a stop and retimes so the clock stays in order', () => {
    const stops = [mk('A', 1, '09:00'), mk('B', 1, '10:20'), mk('C', 1, '11:40')];
    const next = moveStopTo(stops, 2, 0);
    expect(next.map((stop) => stop.name)).toEqual(['C', 'A', 'B']);
    expect(next.map((stop) => stop.arrival)).toEqual(['09:00', '10:20', '11:40']);
  });

  it('adopts the target day when dragging across days', () => {
    const stops = [mk('A', 1, '09:00'), mk('B', 2, '09:00')];
    const next = moveStopTo(stops, 1, 0);
    expect(next.map((stop) => stop.day)).toEqual([1, 1]);
  });

  it('ignores invalid indexes', () => {
    const stops = [mk('A', 1, '09:00'), mk('B', 1, '10:20')];
    expect(moveStopTo(stops, 0, 0)).toBe(stops);
    expect(moveStopTo(stops, 5, 0)).toBe(stops);
  });
});