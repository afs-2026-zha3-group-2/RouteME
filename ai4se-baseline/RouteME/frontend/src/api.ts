import type {
  AiGenerateRequest,
  AiGenerateResponse,
  AiItinerarySaved,
  AiItinerarySnapshot,
  AuthRegisterRequest,
  AuthSession,
  ChatMessage,
  ChatPartner,
  DemoUser,
  Experience,
  ExperienceFilters,
  ExperiencePhoto,
  ExperienceWriteRequest,
  MatchCandidate,
  MyTrips,
  Page,
  Paging,
  ReportRequest,
  TripApplication,
  TripCancelRequest,
  TripCreateRequest,
  TripDetail,
  TripFilters,
  TripMeetingRequest,
  TripSummary,
  UserCreditEntry,
  UserProfile,
  UserProfileUpdateRequest,
  WeatherForecast,
} from './types';

/**
 * 契约错误：保留稳定错误码与可选的字段级原因码，供表单回填。
 */
export class ApiError extends Error {
  readonly code: string;
  readonly fields?: Record<string, string>;
  /** 后端 ErrorResponse.message 的可读文案；展示层优先于稳定错误码。 */
  readonly detail?: string;

  constructor(code: string, fields?: Record<string, string>, detail?: string) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
    this.detail = detail;
  }
}

export async function request(path: string, init?: RequestInit, userId?: number): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (userId !== undefined) {
    headers.set('X-User-Id', String(userId));
  }
  const requestInit = init === undefined && userId === undefined ? undefined : { ...init, headers };
  const response = await fetch(`/api${path}`, requestInit);
  if (!response.ok) {
    const body: { code?: string; message?: string; fields?: Record<string, string> } | null =
      await response.json().catch(() => null);
    throw new ApiError(body?.code || `HTTP ${response.status}`, body?.fields, body?.message);
  }
  return response;
}

export async function loadUsers(): Promise<DemoUser[]> {
  const response = await request('/users');
  return (await response.json()) as DemoUser[];
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

/** 批量读取信用状态；用于行程卡、申请列表与详情页发布者行。 */
export async function loadUserCredits(ids: number[], callerId: number): Promise<UserCreditEntry[]> {
  if (ids.length === 0) {
    return [];
  }
  const query = new URLSearchParams({ ids: ids.join(',') });
  const response = await request(`/users/credits?${query.toString()}`, undefined, callerId);
  return (await response.json()) as UserCreditEntry[];
}

/** 读取个人资料；本人读取时响应包含生日，他人读取时省略。 */
export async function loadUserProfile(userId: number, callerId: number): Promise<UserProfile> {
  const response = await request(`/users/${userId}/profile`, undefined, callerId);
  return (await response.json()) as UserProfile;
}

/** 保存当前会话用户的资料，返回保存后的完整资料。 */
export async function saveMyProfile(
  token: string,
  body: UserProfileUpdateRequest,
): Promise<UserProfile> {
  const response = await request('/users/me/profile', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return (await response.json()) as UserProfile;
}

/** 上传头像（multipart `file`），返回包含新 `avatar_url` 的资料。 */
export async function uploadAvatar(token: string, file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append('file', file);
  const response = await request('/users/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return (await response.json()) as UserProfile;
}

function tripQuery(filters: TripFilters, paging?: Paging): string {
  const params = new URLSearchParams();
  if (filters.destination_code) {
    params.set('destination_code', filters.destination_code);
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

export async function cancelTrip(
  userId: number,
  tripId: number,
  body: TripCancelRequest,
): Promise<TripDetail> {
  const response = await request(
    `/trips/${tripId}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    userId,
  );
  return (await response.json()) as TripDetail;
}

export async function saveTripMeeting(
  userId: number,
  tripId: number,
  body: TripMeetingRequest,
): Promise<TripDetail> {
  const response = await request(
    `/trips/${tripId}/meeting`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    userId,
  );
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
  if (filters.destination_code) {
    params.set('destination_code', filters.destination_code);
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

export async function uploadExperiencePhoto(
  userId: number,
  tripId: number,
  file: File,
): Promise<ExperiencePhoto> {
  const form = new FormData();
  form.append('file', file);
  const response = await request(
    `/trips/${tripId}/experiences/photos`,
    { method: 'POST', body: form },
    userId,
  );
  return (await response.json()) as ExperiencePhoto;
}

/** 目的地日期天气（Open-Meteo）；公开只读，失败由调用方展示可重试状态。 */
export async function fetchWeatherForecast(
  destinationCode: string,
  date: string,
  point?: { lng: number; lat: number },
): Promise<WeatherForecast> {
  const params = new URLSearchParams({ destination_code: destinationCode, date });
  if (point !== undefined) {
    params.set('lng', String(point.lng));
    params.set('lat', String(point.lat));
  }
  const response = await request(`/weather/forecast?${params.toString()}`);
  return (await response.json()) as WeatherForecast;
}

/* ---------- AI 智能规划（契约 0.17.0；天气复用 add-trip-weather） ---------- */

/** AI 生成推荐行程；响应内 weather 为后端实际注入提示词的权威天气。 */
export async function generateAiItinerary(
  userId: number,
  body: AiGenerateRequest,
): Promise<AiGenerateResponse> {
  const response = await request(
    '/ai/itineraries/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    userId,
  );
  return (await response.json()) as AiGenerateResponse;
}

/** 保存完整快照；resolved ≥ 2 且坐标为数值，否则后端 400。 */
export async function saveAiItinerary(
  userId: number,
  snapshot: AiItinerarySnapshot,
): Promise<AiItinerarySaved> {
  const response = await request(
    '/ai/itineraries',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    },
    userId,
  );
  return (await response.json()) as AiItinerarySaved;
}

/** 读取快照（原样返回）；不存在或非本人一律 400 INVALID_INPUT。 */
export async function loadAiItinerary(
  userId: number,
  itineraryId: number,
): Promise<AiItinerarySnapshot> {
  const response = await request(`/ai/itineraries/${itineraryId}`, undefined, userId);
  return (await response.json()) as AiItinerarySnapshot;
}