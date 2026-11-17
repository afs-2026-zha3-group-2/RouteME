/**
 * 列表接口的分页对象：total 是筛选后的命中数，total_pages 为向上取整的页数。
 */
export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
  total_pages: number;
};

export type Paging = {
  page: number;
  size: number;
};

export type AccountRole = 'USER' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export type BanReasonCode =
  | 'HARASSMENT'
  | 'FAKE_TRIP'
  | 'FRAUD_RISK'
  | 'ILLEGAL_CONTENT'
  | 'IMPERSONATION'
  | 'NO_SHOW_DISRUPTION'
  | 'PRIVACY_LEAK'
  | 'OTHER';

/** 信用等级：由后端按分数实时派生，前端只负责文案与配色映射。 */
export type CreditLevel = 'excellent' | 'good' | 'fair' | 'low' | 'risk';

/** 批量信用状态项（`GET /api/users/credits`）；不含任何明细。 */
export type UserCreditEntry = {
  user_id: number;
  credit_score: number;
  credit_level: CreditLevel;
};

/**
 * 用户摘要：身份门、行程发布者、体验作者与会话用户共用。
 * 资料未完善时 city / major / job 缺省，学校可为空串。
 * `role` / `status` 只读，用于后台入口可见性与只读态；`email` 不下发。
 */
export type DemoUser = {
  id: number;
  nickname: string;
  avatar_initial: string;
  avatar_url?: string | null;
  school?: string | null;
  bio: string;
  interests: string[];
  city?: string | null;
  major?: string | null;
  job?: string | null;
  profile_complete: boolean;
  role?: AccountRole | null;
  status?: AccountStatus | null;
};

/** 公开资料弹窗的四项旅行统计。 */
export type ProfileStats = {
  published: number;
  completed: number;
  joined: number;
  shared: number;
};

/**
 * 个人资料（`GET /api/users/{id}/profile`）：生日只出现在本人响应；
 * joined_at 与 stats 是公开字段，不包含账户凭据。
 */
export type UserProfile = {
  id: number;
  nickname: string;
  avatar_initial: string;
  avatar_url?: string | null;
  birthday?: string | null;
  age?: number | null;
  zodiac?: string | null;
  gender?: string | null;
  city?: string | null;
  school?: string | null;
  major?: string | null;
  job?: string | null;
  mbti?: string | null;
  interests: string[];
  travel_style?: string | null;
  bio?: string | null;
  profile_complete: boolean;
  /** 信用分，0–100；本人与他人视角均返回。 */
  credit_score: number;
  credit_level: CreditLevel;
  joined_at?: string | null;
  stats?: ProfileStats;
  /** 账号状态：SUSPENDED 只回 status；BANNED 同时回理由与解封时间。 */
  status?: AccountStatus | null;
  ban_reason_code?: BanReasonCode | null;
  ban_expires_at?: string | null;
};

/** 保存资料（`PUT /api/users/me/profile`）：六项必填，其余可留空。 */
export type UserProfileUpdateRequest = {
  nickname: string;
  birthday: string;
  gender: string;
  city: string;
  interests: string[];
  travel_style: string;
  school?: string | null;
  major?: string | null;
  job?: string | null;
  mbti?: string | null;
  bio?: string | null;
};

export type AuthSession = {
  token: string;
  expires_at: string;
  user: DemoUser;
};

export type AuthRegisterRequest = {
  username: string;
  password: string;
  nickname: string;
  email?: string | null;
};

export type TripStatus = 'recruiting' | 'full' | 'ongoing' | 'completed' | 'cancelled';

/** 发布时可选的出行方式：自驾 / 骑行 / 公共交通（契约 0.15.0 起）。 */
export type TripTravelMode = 'driving' | 'bicycling' | 'transit';

export type TripSummary = {
  id: number;
  title: string;
  destination: string;
  destination_code: string;
  province_code: string;
  province_name: string;
  start_date: string;
  end_date: string;
  stops: string[];
  meeting_areas: string[];
  meeting_time: string | null;
  /** 出行方式；0.15.0 之前发布的行程为 null（视为未填写）。 */
  travel_mode: TripTravelMode | null;
  tags: string[];
  capacity: number;
  joined_count: number;
  status: TripStatus;
  ending_soon: boolean;
  publisher: DemoUser;
  created_at: string;
};

export type TripDetail = TripSummary & {
  note: string | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  participants: DemoUser[];
  completed_at: string | null;
  cancelled_at: string | null;
  /** 仅发布者与已接受同行者可见；其他请求为 null。 */
  cancel_reason: TripCancelReason | null;
  /** 仅「其他原因」必填；仅发布者与已接受同行者可见。 */
  cancel_note: string | null;
};

export type TripCancelReason =
  | 'personal'
  | 'time_changed'
  | 'plan_changed'
  | 'not_enough_people'
  | 'weather'
  | 'illness'
  | 'safety'
  | 'other';

export type TripCancelRequest = {
  reason: TripCancelReason;
  note?: string | null;
};

export type TripCreateRequest = {
  title: string;
  destination_code: string;
  start_date: string;
  end_date: string;
  stops: string[];
  meeting_areas?: string[] | null;
  meeting_time?: string | null;
  travel_mode?: TripTravelMode | null;
  note?: string | null;
  budget_min_cents?: number | null;
  budget_max_cents?: number | null;
  tags: string[];
  capacity: number;
};

export type TripMeetingRequest = {
  meeting_areas?: string[] | null;
  meeting_time?: string | null;
};

export type TripFilters = {
  destination_code?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  sort?: 'match' | 'date' | 'new';
};

export type Match = {
  score: number;
  percentage: number;
  reasons: string[];
  basis: string;
};

export type MatchCandidate = {
  trip: TripSummary;
  match: Match;
};

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'left';

export type TripApplication = {
  id: number;
  trip_id: number;
  applicant: DemoUser;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  decided_at: string | null;
  trip: TripSummary;
};

export type ChatMessage = {
  id: number;
  trip_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  sent_at: string;
};

export type ChatPartner = {
  trip: TripSummary;
  other: DemoUser;
  last_message: ChatMessage | null;
  message_count: number;
};

export type MyTrips = {
  published: TripSummary[];
  applied: TripApplication[];
  matched: TripSummary[];
  completed: TripSummary[];
  pending_application_count: number;
  /** 按行程聚合的待处理申请数；旧后端可能缺省，前端按空数组处理。 */
  pending_applications?: PendingApplicationCount[];
};

/** 「我的旅行」中每条已发布行程的待处理申请数。 */
export type PendingApplicationCount = {
  trip_id: number;
  count: number;
};

export type ReportReason = 'harassment' | 'fake' | 'safety' | 'other';

export type ReportTargetType = 'trip' | 'user' | 'experience';

export type ReportRequest = {
  target_type: ReportTargetType;
  target_id: number;
  reason: ReportReason;
  note?: string | null;
  /** 从行程聊天页提交用户举报时的会话所属行程；其他入口省略。 */
  trip_id?: number | null;
};

export type ExperienceIntensity = 'relaxed' | 'moderate' | 'tiring';

export type ExperiencePhoto = {
  id: number;
  url: string;
};

export type Experience = {
  id: number;
  trip: TripSummary;
  author: DemoUser;
  content: string;
  intensity: ExperienceIntensity;
  advice: string;
  photos: ExperiencePhoto[];
  /** 当前体验的点赞记录数；无记录为 0。 */
  like_count: number;
  /** 当前请求用户是否已点赞；自己的体验恒为 false。 */
  is_liked: boolean;
  created_at: string;
  updated_at: string;
};

/** 点赞 / 取消点赞后的最新状态（`POST /api/experiences/{id}/likes`）。 */
export type ExperienceLikeResult = {
  experience_id: number;
  like_count: number;
  is_liked: boolean;
};

export type ExperienceWriteRequest = {
  content: string;
  intensity: ExperienceIntensity;
  advice: string;
  photo_ids?: number[];
};

export type ExperienceFilters = {
  destination_code?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
};

export type ReportStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';

export type ReportResolutionAction = 'SUSPEND' | 'BAN' | 'KEEP' | 'UPDATE_BAN' | 'REJECT';

export type ServiceSessionStatus = 'WAITING' | 'HANDLING' | 'CLOSED';

export type AdminStatusAction = 'SUSPEND' | 'BAN' | 'RESTORE';

export type AdminUserRef = {
  id: number;
  nickname: string;
};

export type AdminUserTripRef = {
  id: number;
  title: string;
  status: TripStatus;
  start_date: string;
};

export type AdminUserExperienceRef = {
  id: number;
  trip_id: number;
  trip_title: string;
  created_at: string;
};

export type AdminUserReportRef = {
  id: number;
  code: string;
  direction: 'REPORTER' | 'REPORTED';
  status: ReportStatus;
  reason: ReportReason;
  created_at: string;
};

/** 管理端用户列表行（`GET /admin/users`）。 */
export type AdminUserSummary = {
  id: number;
  nickname: string;
  avatar_initial: string;
  avatar_url?: string | null;
  email?: string | null;
  role: AccountRole;
  status: AccountStatus;
  created_at: string;
};

/** 管理端用户详情（`GET /admin/users/{id}`）：资料 + 处罚 + 三类关联内容。 */
export type AdminUserDetail = AdminUserSummary & {
  school?: string | null;
  city?: string | null;
  major?: string | null;
  job?: string | null;
  bio?: string | null;
  interests: string[];
  status_reason?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: AdminUserRef | null;
  ban_expires_at?: string | null;
  ban_reason_code?: BanReasonCode | null;
  ban_reason_note?: string | null;
  trips: AdminUserTripRef[];
  experiences: AdminUserExperienceRef[];
  reports: AdminUserReportRef[];
  trip_total: number;
  experience_total: number;
  report_total: number;
};

export type AdminUserStatusRequest = {
  action: AdminStatusAction;
  reason?: string | null;
  ban_reason_code?: BanReasonCode | null;
  ban_reason_note?: string | null;
  ban_expires_at?: string | null;
};

export type ReportedUser = {
  id: number;
  nickname: string;
  status: AccountStatus;
};

/** 举报队列行（`GET /admin/reports`）。 */
export type AdminReportSummary = {
  id: number;
  code: string;
  target_type: ReportTargetType;
  target_id: number;
  target_label: string;
  reporter: AdminUserRef;
  reported_user?: ReportedUser | null;
  reason: ReportReason;
  created_at: string;
  status: ReportStatus;
};

export type AdminReportTarget = {
  type: ReportTargetType;
  id: number;
  label: string;
  exists: boolean;
  content_excerpt?: string | null;
};

export type AdminReportContextOrigin = 'chat' | 'trip';

/** 举报关联行程摘要：聊天举报显示会话所属行程，行程举报显示被举报行程。 */
export type AdminReportTripContext = {
  id: number;
  title?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: TripStatus;
  publisher?: AdminUserRef | null;
};

export type AdminReportMessage = {
  id: number;
  sender: AdminUserRef;
  receiver: AdminUserRef;
  content: string;
  sent_at: string;
};

/** 举报来源：`chat` 回放双方会话，`trip` 只给行程概要。 */
export type AdminReportContext = {
  origin: AdminReportContextOrigin;
  trip?: AdminReportTripContext | null;
  messages: AdminReportMessage[];
};

/** 举报详情（`GET /admin/reports/{id}`）：上下文 + 处置历史。 */
export type AdminReportDetail = AdminReportSummary & {
  note?: string | null;
  target: AdminReportTarget;
  context?: AdminReportContext | null;
  processed_by?: AdminUserRef | null;
  processing_at?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  resolution_action?: ReportResolutionAction | null;
};

export type AdminReportResolveRequest = {
  outcome: 'RESOLVED' | 'REJECTED';
  note: string;
  action?: Exclude<ReportResolutionAction, 'REJECT'> | null;
  ban_reason_code?: BanReasonCode | null;
  ban_reason_note?: string | null;
  ban_expires_at?: string | null;
};

export type ServiceUser = {
  id: number;
  nickname: string;
  avatar_initial: string;
  email?: string | null;
  status: AccountStatus;
  created_at: string;
};

export type ServiceSessionSummary = {
  id: number;
  user: ServiceUser;
  status: ServiceSessionStatus;
  created_at: string;
  joined_at?: string | null;
  closed_at?: string | null;
  last_message_at?: string | null;
  message_count: number;
};

export type ServiceMessage = {
  id: number;
  session_id: number;
  sender_type: 'USER' | 'ADMIN';
  sender_id: number;
  sender_nickname: string;
  content: string;
  created_at: string;
};

export type ServiceSessionDetail = ServiceSessionSummary & {
  messages: ServiceMessage[];
  reports?: AdminUserReportRef[];
};

/** 用户侧「我的举报」行：不含备注、处理人与处罚信息。 */
export type HelpReportSummary = {
  id: number;
  code: string;
  target_type: ReportTargetType;
  target_id: number;
  target_label: string;
  reason: ReportReason;
  created_at: string;
  status: ReportStatus;
};

export type HelpReports = {
  items: HelpReportSummary[];
  total: number;
};

/** Open-Meteo 单日天气；上游缺省的字段为 null，页面不展示对应项。 */
export type WeatherDaily = {
  weather_code: number | null;
  weather_text: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_probability_pct: number | null;
  precipitation_mm: number | null;
  wind_speed_kmh: number | null;
  uv_index: number | null;
};

/** 提醒类别：决定前端标签与色调，文案本身来自后端。 */
export type WeatherReminderCode =
  | 'rain'
  | 'heat'
  | 'uv'
  | 'cold'
  | 'temperature_gap'
  | 'wind'
  | 'calm';

export type WeatherReminder = {
  code: WeatherReminderCode;
  text: string;
};

/** 目的地单日天气响应；`available=false` 时不携带任何天气数值。 */
export type WeatherForecast = {
  date: string;
  destination_code: string | null;
  city: string | null;
  lng: number | null;
  lat: number | null;
  available: boolean;
  reason: 'OUT_OF_RANGE' | null;
  weather: WeatherDaily | null;
  reminders: WeatherReminder[];
  source: 'open-meteo';
};

/** 安全学习题库的四类题材，与契约 `LearningQuestion.category` 同值。 */
export type LearningCategory = 'travel_safety' | 'stranger_companion' | 'platform_rules' | 'privacy';

/** 下发的题目：选项顺序即作答下标，响应不含正确答案。 */
export type LearningQuestion = {
  id: string;
  category: LearningCategory;
  question: string;
  options: string[];
};

/** 考试会话（`LearningSession`）：`learning_completed` 为 false 时提交作答会被拒。 */
export type LearningSession = {
  session_id: number;
  questions: LearningQuestion[];
  exam_used: number;
  exam_limit: number;
  month: string;
  learning_completed: boolean;
};

/** 逐题对错：`question_id` 对应下发题目，正确答案不下发。 */
export type LearningAnswerDetail = {
  question_id: string;
  correct: boolean;
};

/** 判分结果（`LearningResult`）：`recovery_applied` 为 false 时不得播报「已恢复」。 */
export type LearningResult = {
  session_id: number;
  passed: boolean;
  score: number;
  pass_line: number;
  details: LearningAnswerDetail[];
  recovery_applied: boolean;
  credit_score: number;
  credit_level: CreditLevel;
};
