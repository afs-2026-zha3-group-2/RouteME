import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash } from './route';

describe('parseRoute', () => {
  it('maps the root hash to the home route', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
  });

  it('maps the trip creation path', () => {
    expect(parseRoute('#/trips/new')).toEqual({ name: 'create' });
  });

  it('maps a numeric trip id to the detail route', () => {
    expect(parseRoute('#/trips/12')).toEqual({ name: 'detail', tripId: 12 });
  });

  it('falls back to notFound for unknown paths', () => {
    expect(parseRoute('#/trips/abc')).toEqual({ name: 'notFound' });
    expect(parseRoute('#/settings')).toEqual({ name: 'notFound' });
  });

  it('round-trips every route through its hash', () => {
    const routes = [
      { name: 'home' as const },
      { name: 'create' as const },
      { name: 'detail' as const, tripId: 7 },
    ];
    expect(routes.map((route) => parseRoute(routeToHash(route)))).toEqual(routes);
  });
});