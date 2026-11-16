import type {
  AuthRegisterRequest,
  AuthSession,
  ChatMessage,
  ChatPartner,
  DemoUser,
  Experience,
  ExperienceFilters,
  ExperienceWriteRequest,
  Greeting,
  MatchCandidate,
  MyTrips,
  Page,
  Paging,
  ReportRequest,
  TripApplication,
  TripCreateRequest,
  TripDetail,
  TripFilters,
  TripSummary,
  UserProfile,
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

export async function loadDemoUsers(): Promise<DemoUser[]> {
  const response = await request('/users/demo');
  return (await response.json()) as DemoUser[];
}

export async function loadUserProfile(userId: number): Promise<UserProfile> {
  const response = await request(`/users/${userId}/profile`);
  return (await response.json()) as UserProfile;
}

export async function registerAccount(body: AuthRegisterRequest): Promise<AuthSession> {
  const response = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as AuthSession;
}

export async function loginAccount(username: string, password: string): Promise<AuthSession> {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return (await response.json()) as AuthSession;
}

export async function loadSessionUser(token: string): Promise<DemoUser> {
  const response = await request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()) as DemoUser;
}

export async function logoutAccount(token: string): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function tripQuery(filters: TripFilters, paging?: Paging): string {
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
  if (paging !== undefined) {
    params.set('page', String(paging.page));
    params.set('size', String(paging.size));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function loadTrips(
  userId: number,
  filters: TripFilters = {},
  paging?: Paging,
): Promise<Page<TripSummary>> {
  const response = await request(`/trips${tripQuery(filters, paging)}`, undefined, userId);
  return (await response.json()) as Page<TripSummary>;
}

export async function loadMatches(
  userId: number,
  filters: TripFilters = {},
  paging?: Paging,
): Promise<Page<MatchCandidate>> {
  const response = await request(`/matches${tripQuery(filters, paging)}`, undefined, userId);
  return (await response.json()) as Page<MatchCandidate>;
}

export async function loadMatch(userId: number, tripId: number): Promise<MatchCandidate> {
  const response = await request(`/matches/${tripId}`, undefined, userId);
  return (await response.json()) as MatchCandidate;
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

export async function loadTripApplications(userId: number, tripId: number): Promise<TripApplication[]> {
  const response = await request(`/trips/${tripId}/applications`, undefined, userId);
  return (await response.json()) as TripApplication[];
}

export async function applyForTrip(
  userId: number,
  tripId: number,
  message: string | null,
): Promise<TripApplication> {
  const response = await request(
    `/trips/${tripId}/applications`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    },
    userId,
  );
  return (await response.json()) as TripApplication;
}

export async function loadMyApplications(userId: number): Promise<TripApplication[]> {
  const response = await request('/me/applications', undefined, userId);
  return (await response.json()) as TripApplication[];
}

export async function cancelApplication(userId: number, applicationId: number): Promise<TripApplication> {
  const response = await request(`/applications/${applicationId}/cancel`, { method: 'POST' }, userId);
  return (await response.json()) as TripApplication;
}

export async function acceptApplication(userId: number, applicationId: number): Promise<TripApplication> {
  const response = await request(`/applications/${applicationId}/accept`, { method: 'POST' }, userId);
  return (await response.json()) as TripApplication;
}

export async function rejectApplication(userId: number, applicationId: number): Promise<TripApplication> {
  const response = await request(`/applications/${applicationId}/reject`, { method: 'POST' }, userId);
  return (await response.json()) as TripApplication;
}

export async function leaveTrip(userId: number, tripId: number): Promise<void> {
  await request(`/trips/${tripId}/leave`, { method: 'POST' }, userId);
}

export async function loadMyTrips(userId: number): Promise<MyTrips> {
  const response = await request('/me/trips', undefined, userId);
  return (await response.json()) as MyTrips;
}

export async function loadChatPartners(userId: number): Promise<ChatPartner[]> {
  const response = await request('/me/chat-partners', undefined, userId);
  return (await response.json()) as ChatPartner[];
}

export async function loadMessages(
  userId: number,
  tripId: number,
  withUserId: number,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ with: String(withUserId) });
  const response = await request(`/trips/${tripId}/messages?${params.toString()}`, undefined, userId);
  return (await response.json()) as ChatMessage[];
}

export async function sendMessage(
  userId: number,
  tripId: number,
  receiverId: number,
  content: string,
): Promise<ChatMessage> {
  const response = await request(
    `/trips/${tripId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: receiverId, content }),
    },
    userId,
  );
  return (await response.json()) as ChatMessage;
}

export async function submitReport(
  userId: number,
  body: ReportRequest,
): Promise<{ received: boolean }> {
  const response = await request(
    '/reports',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    userId,
  );
  return (await response.json()) as { received: boolean };
}

export async function loadExperiences(
  userId: number,
  filters: ExperienceFilters = {},
  paging?: Paging,
): Promise<Page<Experience>> {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set('q', filters.q);
  }
  if (filters.destination) {
    params.set('destination', filters.destination);
  }
  if (filters.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }
  if (paging !== undefined) {
    params.set('page', String(paging.page));
    params.set('size', String(paging.size));
  }
  const query = params.toString();
  const response = await request(`/experiences${query ? `?${query}` : ''}`, undefined, userId);
  return (await response.json()) as Page<Experience>;
}

export async function loadTripExperiences(userId: number, tripId: number): Promise<Experience[]> {
  const response = await request(`/trips/${tripId}/experiences`, undefined, userId);
  return (await response.json()) as Experience[];
}

export async function loadMyExperiences(userId: number): Promise<Experience[]> {
  const response = await request('/me/experiences', undefined, userId);
  return (await response.json()) as Experience[];
}

export async function shareExperience(
  userId: number,
  tripId: number,
  body: ExperienceWriteRequest,
): Promise<Experience> {
  const response = await request(
    `/trips/${tripId}/experiences`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    userId,
  );
  return (await response.json()) as Experience;
}