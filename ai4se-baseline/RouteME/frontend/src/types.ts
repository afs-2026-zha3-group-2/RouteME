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

export type TripStatus = 'recruiting' | 'full' | 'ongoing' | 'completed';

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
  tags: string[];
  capacity: number;
  joined_count: number;
  status: TripStatus;
  ending_soon: boolean;
  publisher: DemoUser;
  created_at: string;
};

export type TripDetail = TripSummary & {
  meeting_area: string | null;
  note: string | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  participants: DemoUser[];
  completed_at: string | null;
};

export type TripCreateRequest = {
  title: string;
  destination_code: string;
  start_date: string;
  end_date: string;
  stops: string[];
  meeting_area?: string | null;
  note?: string | null;
  budget_min_cents?: number | null;
  budget_max_cents?: number | null;
  tags: string[];
  capacity: number;
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

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

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
};

export type ReportReason = 'harassment' | 'fake' | 'safety' | 'other';

export type ReportRequest = {
  target_type: 'trip' | 'user';
  target_id: number;
  reason: ReportReason;
  note?: string | null;
};

export type ExperienceIntensity = 'relaxed' | 'moderate' | 'tiring';

export type Experience = {
  id: number;
  trip: TripSummary;
  author: DemoUser;
  content: string;
  intensity: ExperienceIntensity;
  advice: string;
  created_at: string;
  updated_at: string;
};

export type ExperienceWriteRequest = {
  content: string;
  intensity: ExperienceIntensity;
  advice: string;
};

export type ExperienceFilters = {
  destination_code?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
};