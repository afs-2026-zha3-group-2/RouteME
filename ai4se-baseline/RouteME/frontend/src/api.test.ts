import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrip, loadGreeting, loadMatches, loadTrips } from './api';

describe('loadGreeting', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the greeting parsed from the backend response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, message: 'Hello World' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadGreeting()).resolves.toEqual({ id: 1, message: 'Hello World' });
    expect(fetchMock).toHaveBeenCalledWith('/api/greeting', undefined);
  });

  it('throws the contract error code when the backend rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'GREETING_NOT_FOUND' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(loadGreeting()).rejects.toThrow('GREETING_NOT_FOUND');
  });
});

    describe('loadTrips', () => {
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('sends the demo identity header and serializes the filters', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(
          loadTrips(2, { destination: '珠海', tags: ['摄影', '海边'], sort: 'new' }),
        ).resolves.toEqual([]);

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        const parsed = new URL(url, 'http://localhost');
        expect(parsed.pathname).toBe('/api/trips');
        expect(parsed.searchParams.get('destination')).toBe('珠海');
        expect(parsed.searchParams.get('tags')).toBe('摄影,海边');
        expect(parsed.searchParams.get('sort')).toBe('new');
        expect((init.headers as Headers).get('X-User-Id')).toBe('2');
      });

              it('loads match candidates with the match sort by default', async () => {
                const fetchMock = vi.fn().mockResolvedValue(
                  new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                  }),
                );
                vi.stubGlobal('fetch', fetchMock);

                await expect(loadMatches(2, { sort: 'match' })).resolves.toEqual([]);

                const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
                const parsed = new URL(url, 'http://localhost');
                expect(parsed.pathname).toBe('/api/matches');
                expect(parsed.searchParams.get('sort')).toBe('match');
              });
            });

    describe('createTrip', () => {
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('posts json with the identity header and returns the created trip', async () => {
        const created = { id: 7, status: 'recruiting' };
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify(created), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(
          createTrip(1, {
            title: '周末骑行',
            destination: '珠海',
            start_date: '2026-11-20',
            end_date: '2026-11-20',
            stops: ['集合', '终点'],
            tags: [],
            capacity: 3,
          }),
        ).resolves.toEqual(created);

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/trips');
        expect(init.method).toBe('POST');
        expect((init.headers as Headers).get('X-User-Id')).toBe('1');
        expect(init.body).toContain('周末骑行');
      });
    });
