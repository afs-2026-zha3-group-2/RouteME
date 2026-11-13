import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGreeting } from './api';

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
