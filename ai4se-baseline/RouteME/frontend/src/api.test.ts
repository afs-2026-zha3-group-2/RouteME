import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  confirmInsurance,
  createLoan,
  createTrip,
  loadMyFinance,
  loadTrips,
  loadTripFinance,
  openInsurancePurchase,
  repayLoan,
  verifyStudentIdentity,
} from './api';

describe('verifyStudentIdentity', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the verification body with the bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 9, nickname: '新同学', student_verified: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      verifyStudentIdentity('session-token', {
        name: '张三',
        school: '中山大学',
        code: 'AB12CD34EF56',
      }),
    ).resolves.toMatchObject({ id: 9, student_verified: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/users/me/student-verification');
    expect(init.method).toBe('POST');
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer session-token');
    expect(JSON.parse(init.body as string)).toEqual({
      name: '张三',
      school: '中山大学',
      code: 'AB12CD34EF56',
    });
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
      loadTrips(2, { destination_code: '440400', tags: ['摄影', '海边'], sort: 'new' }),
    ).resolves.toEqual([]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.pathname).toBe('/api/trips');
    expect(parsed.searchParams.get('destination_code')).toBe('440400');
    expect(parsed.searchParams.get('tags')).toBe('摄影,海边');
    expect(parsed.searchParams.get('sort')).toBe('new');
    expect((init.headers as Headers).get('X-User-Id')).toBe('2');
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
            destination_code: '440400',
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

describe('finance api', () => {
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      function stubJson(payload: unknown, status = 200): ReturnType<typeof vi.fn> {
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify(payload), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
        vi.stubGlobal('fetch', fetchMock);
        return fetchMock;
      }

      it('loads the account aggregate with the identity header', async () => {
        const fetchMock = stubJson({ wallet: { balance_cents: 1_000_000 }, ledger: [], policies: [], loans: [] });

        await expect(loadMyFinance(2)).resolves.toMatchObject({
          wallet: { balance_cents: 1_000_000 },
        });
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/me/finance');
        expect((init.headers as Headers).get('X-User-Id')).toBe('2');
      });

      it('loads the trip finance aggregate', async () => {
        const fetchMock = stubJson({ trip_id: 3, is_eligible: true });

        await expect(loadTripFinance(2, 3)).resolves.toMatchObject({ trip_id: 3 });
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/trips/3/finance');
        expect((init.headers as Headers).get('X-User-Id')).toBe('2');
      });

      it('opens the third-party purchase redirect and confirms the result', async () => {
        const fetchMock = stubJson({ redirect_url: 'https://example.com/purchase?trip_id=3' });

        await expect(openInsurancePurchase(2, 3)).resolves.toEqual({
          redirect_url: 'https://example.com/purchase?trip_id=3',
        });
        const [purchaseUrl, purchaseInit] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(purchaseUrl).toBe('/api/trips/3/insurance/purchase');
        expect(purchaseInit.method).toBe('POST');
        expect(purchaseInit.body).toBeUndefined();
        expect((purchaseInit.headers as Headers).get('X-User-Id')).toBe('2');

        fetchMock.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 11, status: 'active', provider: '第三方保险机构（演示）' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
        await expect(confirmInsurance(2, 3)).resolves.toMatchObject({ id: 11, status: 'active' });
        const [confirmUrl, confirmInit] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(confirmUrl).toBe('/api/trips/3/insurance/confirm');
        expect(confirmInit.method).toBe('POST');
        expect((confirmInit.headers as Headers).get('X-User-Id')).toBe('2');
      });

      it('posts a loan request and repays without a body', async () => {
        const fetchMock = stubJson({ id: 5, status: 'active' }, 201);

        await createLoan(2, 3, { principal_cents: 100_000, term_days: 14 });
        const [loanUrl, loanInit] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(loanUrl).toBe('/api/trips/3/loans');
        expect(loanInit.method).toBe('POST');
        expect(JSON.parse(String(loanInit.body))).toEqual({
          principal_cents: 100_000,
          term_days: 14,
        });

        fetchMock.mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 5, status: 'repaid' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
        await expect(repayLoan(2, 5)).resolves.toEqual({ id: 5, status: 'repaid' });
        const [repayUrl, repayInit] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(repayUrl).toBe('/api/loans/5/repay');
        expect(repayInit.method).toBe('POST');
        expect((repayInit.headers as Headers).get('X-User-Id')).toBe('2');
      });
    });
