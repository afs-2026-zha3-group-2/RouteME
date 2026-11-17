import type {
  AdminReportDetail,
  AdminReportResolveRequest,
  AdminReportSummary,
  AdminUserDetail,
  AdminUserStatusRequest,
  AdminUserSummary,
  AuthRegisterRequest,
  AuthSession,
  ChatMessage,
  ChatPartner,
  DemoUser,
  Experience,
  ExperienceFilters,
  ExperienceLikeResult,
  ExperiencePhoto,
  ExperienceWriteRequest,
  HelpReports,
  LeavePreview,
  LeaveReason,
  LeaveResult,
  MatchCandidate,
  MyTrips,
  Page,
  Paging,
  RecommendationList,
  ReportRequest,
  ServiceMessage,
  ServiceSessionDetail,
  ServiceSessionSummary,
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

  constructor(code: string, fields?: Record<string, string>) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
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
    const body: { code?: string; fields?: Record<string, string> } | null = await response
      .json()
      .catch(() => null);
    throw new ApiError(body?.code || `HTTP ${response.status}`, body?.fields);
  }
  return response;
}

export async function loadUsers(): Promise<DemoUser[]> {
  const response = await request('/users');
  return (await response.json()) as DemoUser[];
}

function bearerInit(token: string, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
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

export async function loadTripRecommendations(
  userId: number,
  tripId: number,
): Promise<RecommendationList> {
  const response = await request(`/trips/${tripId}/recommendations`, undefined, userId);
  return (await response.json()) as RecommendationList;
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

export async function loadLeavePreview(
  userId: number,
  tripId: number,
  reason: LeaveReason,
): Promise<LeavePreview> {
  const response = await request(`/trips/${tripId}/leave-preview?reason=${reason}`, undefined, userId);
  return (await response.json()) as LeavePreview;
}

export async function leaveTrip(
  userId: number,
  tripId: number,
  reason: LeaveReason,
): Promise<LeaveResult> {
  const response = await request(
    `/trips/${tripId}/leave`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    userId,
  );
  return (await response.json()) as LeaveResult;
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

export async function likeExperience(
  userId: number,
  experienceId: number,
): Promise<ExperienceLikeResult> {
  const response = await request(`/experiences/${experienceId}/likes`, { method: 'POST' }, userId);
  return (await response.json()) as ExperienceLikeResult;
}

export async function unlikeExperience(userId: number, experienceId: number): Promise<void> {
  await request(`/experiences/${experienceId}/likes`, { method: 'DELETE' }, userId);
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

function listQuery(filters: {
  q?: string;
  status?: string;
  page?: number;
  size?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q !== undefined && filters.q !== '') {
    params.set('q', filters.q);
  }
  if (filters.status !== undefined && filters.status !== '') {
    params.set('status', filters.status);
  }
  if (filters.page !== undefined) {
    params.set('page', String(filters.page));
  }
  if (filters.size !== undefined) {
    params.set('size', String(filters.size));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** 管理端用户列表：`q` 支持 ID / 昵称 / 邮箱，`status` 为账号状态。 */
export async function loadAdminUsers(
  token: string,
  filters: { q?: string; status?: string; page?: number; size?: number } = {},
): Promise<Page<AdminUserSummary>> {
  const response = await request(`/admin/users${listQuery(filters)}`, bearerInit(token));
  return (await response.json()) as Page<AdminUserSummary>;
}

export async function loadAdminUser(token: string, userId: number): Promise<AdminUserDetail> {
  const response = await request(`/admin/users/${userId}`, bearerInit(token));
  return (await response.json()) as AdminUserDetail;
}

export async function changeUserStatus(
  token: string,
  userId: number,
  body: AdminUserStatusRequest,
): Promise<AdminUserDetail> {
  const response = await request(
    `/admin/users/${userId}/status`,
    bearerInit(token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return (await response.json()) as AdminUserDetail;
}

/** 管理端举报队列：`status` 为 PENDING / PROCESSING / RESOLVED / REJECTED。 */
export async function loadAdminReports(
  token: string,
  filters: { status?: string; page?: number; size?: number } = {},
): Promise<Page<AdminReportSummary>> {
  const response = await request(`/admin/reports${listQuery(filters)}`, bearerInit(token));
  return (await response.json()) as Page<AdminReportSummary>;
}

export async function loadAdminReport(token: string, reportId: number): Promise<AdminReportDetail> {
  const response = await request(`/admin/reports/${reportId}`, bearerInit(token));
  return (await response.json()) as AdminReportDetail;
}

export async function startAdminReport(
  token: string,
  reportId: number,
): Promise<AdminReportDetail> {
  const response = await request(`/admin/reports/${reportId}/start`, bearerInit(token, { method: 'POST' }));
  return (await response.json()) as AdminReportDetail;
}

export async function resolveAdminReport(
  token: string,
  reportId: number,
  body: AdminReportResolveRequest,
): Promise<AdminReportDetail> {
  const response = await request(
    `/admin/reports/${reportId}/resolve`,
    bearerInit(token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return (await response.json()) as AdminReportDetail;
}

/** 管理端客服队列：`WAITING` 升序、其余倒序（服务端排序）。 */
export async function loadAdminServiceSessions(
  token: string,
  filters: { status?: string; page?: number; size?: number } = {},
): Promise<Page<ServiceSessionSummary>> {
  const response = await request(
    `/admin/service/sessions${listQuery(filters)}`,
    bearerInit(token),
  );
  return (await response.json()) as Page<ServiceSessionSummary>;
}

export async function loadAdminServiceSession(
  token: string,
  sessionId: number,
): Promise<ServiceSessionDetail> {
  const response = await request(`/admin/service/sessions/${sessionId}`, bearerInit(token));
  return (await response.json()) as ServiceSessionDetail;
}

export async function joinServiceSession(
  token: string,
  sessionId: number,
): Promise<ServiceSessionDetail> {
  const response = await request(
    `/admin/service/sessions/${sessionId}/join`,
    bearerInit(token, { method: 'POST' }),
  );
  return (await response.json()) as ServiceSessionDetail;
}

export async function closeServiceSession(
  token: string,
  sessionId: number,
): Promise<ServiceSessionDetail> {
  const response = await request(
    `/admin/service/sessions/${sessionId}/close`,
    bearerInit(token, { method: 'POST' }),
  );
  return (await response.json()) as ServiceSessionDetail;
}

/** 用户侧或管理端发消息；发送者类型由服务端按角色判定。 */
export async function sendServiceMessage(
  token: string,
  sessionId: number,
  content: string,
): Promise<ServiceMessage> {
  const response = await request(
    `/service/sessions/${sessionId}/messages`,
    bearerInit(token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }),
  );
  return (await response.json()) as ServiceMessage;
}

/** 当前未结束的客服会话；没有时后端返回 200 空体。 */
export async function loadCurrentServiceSession(
  token: string,
): Promise<ServiceSessionDetail | null> {
  const response = await request('/service/sessions/current', bearerInit(token));
  const body = await response.text();
  return body === '' ? null : (JSON.parse(body) as ServiceSessionDetail);
}

/** 创建或返回既有未结束会话（幂等）。 */
export async function openServiceSession(token: string): Promise<ServiceSessionDetail> {
  const response = await request('/service/sessions', bearerInit(token, { method: 'POST' }));
  return (await response.json()) as ServiceSessionDetail;
}

export async function loadServiceMessages(
  token: string,
  sessionId: number,
): Promise<ServiceMessage[]> {
  const response = await request(
    `/service/sessions/${sessionId}/messages`,
    bearerInit(token),
  );
  return (await response.json()) as ServiceMessage[];
}

/** 我的举报：仅本人，按时间倒序，最多最近 50 条。 */
export async function loadHelpReports(token: string): Promise<HelpReports> {
  const response = await request('/help/reports', bearerInit(token));
  return (await response.json()) as HelpReports;
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