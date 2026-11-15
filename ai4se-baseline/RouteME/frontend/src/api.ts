import type {
  DemoUser,
  Greeting,
  TripCreateRequest,
  TripDetail,
  TripFilters,
  TripSummary,
} from './types';

export async function request(path: string, init?: RequestInit, userId?: number): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (userId !== undefined) {
    headers.set('X-User-Id', String(userId));
  }
  const requestInit = init === undefined && userId === undefined ? undefined : { ...init, headers };
  const response = await fetch(`/api${path}`, requestInit);
  if (!response.ok) {
    const body: { code?: string } | null = await response.json().catch(() => null);
    throw new Error(body?.code || `HTTP ${response.status}`);
  }
  return response;
}

export async function loadGreeting(): Promise<Greeting> {
  const response = await request('/greeting');
  return (await response.json()) as Greeting;
}

export async function loadUsers(): Promise<DemoUser[]> {
  const response = await request('/users');
  return (await response.json()) as DemoUser[];
}

export async function loadTrips(userId: number, filters: TripFilters = {}): Promise<TripSummary[]> {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set('q', filters.q);
  }
  if (filters.destination) {
    params.set('destination', filters.destination);
  }
  if (filters.date_from) {
    params.set('date_from', filters.date_from);
  }
  if (filters.date_to) {
    params.set('date_to', filters.date_to);
  }
  if (filters.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }
  if (filters.sort) {
    params.set('sort', filters.sort);
  }
  const query = params.toString();
  const response = await request(`/trips${query ? `?${query}` : ''}`, undefined, userId);
  return (await response.json()) as TripSummary[];
}

export async function loadTrip(userId: number, tripId: number): Promise<TripDetail> {
  const response = await request(`/trips/${tripId}`, undefined, userId);
  return (await response.json()) as TripDetail;
}

export async function createTrip(userId: number, body: TripCreateRequest): Promise<TripDetail> {
  const response = await request(
    '/trips',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    userId,
  );
  return (await response.json()) as TripDetail;
}

export async function completeTrip(userId: number, tripId: number): Promise<TripDetail> {
  const response = await request(`/trips/${tripId}/complete`, { method: 'POST' }, userId);
  return (await response.json()) as TripDetail;
}