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
      expect(parseRoute('#/chat')).toEqual({ name: 'chat' });
      expect(parseRoute('#/share/12')).toEqual({ name: 'share', tripId: 12 });
    });

    it('keeps the reference source when creating from a trip', () => {
      expect(parseRoute('#/trips/new?from=7')).toEqual({ name: 'create', fromTripId: 7 });
      expect(parseRoute('#/trips/new')).toEqual({ name: 'create' });
    });

    it('maps the AI planner page', () => {
      expect(parseRoute('#/ai-planner')).toEqual({ name: 'aiPlanner' });
    });

    it('keeps the AI snapshot source when creating from a plan', () => {
      expect(parseRoute('#/trips/new?ai=12')).toEqual({ name: 'create', aiItineraryId: 12 });
      expect(parseRoute('#/trips/new?from=3&ai=12')).toEqual({ name: 'create', aiItineraryId: 12 });
      expect(parseRoute('#/trips/new?ai=abc')).toEqual({ name: 'create' });
      expect(parseRoute('#/trips/new?ai=0')).toEqual({ name: 'create' });
    });

    it('maps the profile setup and public profile paths', () => {
      expect(parseRoute('#/profile/setup')).toEqual({ name: 'profileSetup' });
      expect(parseRoute('#/users/12')).toEqual({ name: 'userProfile', userId: 12 });
      expect(parseRoute('#/users/abc')).toEqual({ name: 'notFound' });
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
        { name: 'create' as const, fromTripId: 7 },
        { name: 'create' as const, aiItineraryId: 12 },
        { name: 'aiPlanner' as const },
        { name: 'detail' as const, tripId: 7 },
        { name: 'applications' as const, tripId: 7 },
        { name: 'mine' as const },
        { name: 'chat' as const, tripId: 7, userId: 2 },
        { name: 'chat' as const },
        { name: 'share' as const, tripId: 7 },
        { name: 'profileSetup' as const },
        { name: 'userProfile' as const, userId: 7 },
      ];
      expect(routes.map((route) => parseRoute(routeToHash(route)))).toEqual(routes);
    });
});