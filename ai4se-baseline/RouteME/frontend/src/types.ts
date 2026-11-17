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

/** 信用等级：由后端按分数实时派生，前端只负责文案与配色映射。 */
export type CreditLevel = 'excellent' | 'good' | 'fair' | 'low' | 'risk';

/** 批量信用状态项（`GET /api/users/credits`）；不含任何明细。 */
export type UserCreditEntry = {
  user_id: number;
  credit_score: number;
  credit_level: CreditLevel;
  /** 分数低于 60 时为 true；五个展示面据此显示「限制中」徽标。 */
  credit_restricted: boolean;
};

/**
 * 用户摘要：身份门、行程发布者、体验作者与会话用户共用。
 * 资料未完善时 city / major / job 缺省，学校可为空串。
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
  /** 当前是否处于信用限制。 */
  credit_restricted: boolean;
  /** 限制原因；仅本人个人主页返回，他人响应省略。 */
  credit_restriction_reason?: 'CREDIT_SCORE_BELOW_60' | null;
  joined_at?: string | null;
  stats?: ProfileStats;
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
};

export type TripStatus = 'recruiting' | 'full' | 'ongoing' | 'completed' | 'cancelled';

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
  | 'other'
  | 'credit_restricted';

/** 发布者可选的 8 项；credit_restricted 只由系统写入。 */
export type UserTripCancelReason = Exclude<TripCancelReason, 'credit_restricted'>;

export type TripCancelRequest = {
  reason: UserTripCancelReason;
  note?: string | null;
};

/** 退出同行的原因。 */
export type LeaveReason = 'personal' | 'force_majeure' | 'safety';

export type LeaveStatus = 'not_required' | 'pending' | 'verified_true' | 'verified_false';

export type LeaveMessageCode =
  | 'penalty'
  | 'penalty_doubled'
  | 'no_penalty'
  | 'during_trip'
  | 'pending_review'
  | 'at_floor';

export type LeavePreview = {
  reason: LeaveReason;
  departure_at: string;
  penalty_tier: 'ge7d' | 'd3to7d' | 'h24to72' | 'h12to24' | 'lt12h' | 'during';
  theoretical_delta: number;
  applied_delta: number;
  monthly_ordinal: number;
  monthly_doubled: boolean;
  counted: boolean;
  review_status: LeaveStatus;
  resulting_score: number;
  message_code: LeaveMessageCode;
};

export type LeaveResult = {
  credit_score: number;
  credit_level: CreditLevel;
  credit_restricted: boolean;
  theoretical_delta: number;
  applied_delta: number;
  monthly_ordinal: number;
  review_status: LeaveStatus;
  message_code: LeaveMessageCode;
};

export type TripCreateRequest = {
  title: string;
  destination_code: string;
  start_date: string;
  end_date: string;
  stops: string[];
  meeting_areas?: string[] | null;
  meeting_time?: string | null;
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

export type ReportRequest = {
  target_type: 'trip' | 'user';
  target_id: number;
  reason: ReportReason;
  note?: string | null;
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
  created_at: string;
  updated_at: string;
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