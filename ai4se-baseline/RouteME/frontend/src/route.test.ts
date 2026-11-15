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

    it('maps the companions paths', () => {
      expect(parseRoute('#/mine')).toEqual({ name: 'mine' });
      expect(parseRoute('#/trips/12/applications')).toEqual({ name: 'applications', tripId: 12 });
      expect(parseRoute('#/chat/12/3')).toEqual({ name: 'chat', tripId: 12, userId: 3 });
    });

    it('falls back to notFound for unknown paths', () => {
      expect(parseRoute('#/trips/abc')).toEqual({ name: 'notFound' });
      expect(parseRoute('#/settings')).toEqual({ name: 'notFound' });
      expect(parseRoute('#/chat/12')).toEqual({ name: 'notFound' });
    });

    it('round-trips every route through its hash', () => {
      const routes = [
        { name: 'home' as const },
        { name: 'create' as const },
        { name: 'detail' as const, tripId: 7 },
        { name: 'applications' as const, tripId: 7 },
        { name: 'mine' as const },
        { name: 'chat' as const, tripId: 7, userId: 2 },
      ];
      expect(routes.map((route) => parseRoute(routeToHash(route)))).toEqual(routes);
    });
});