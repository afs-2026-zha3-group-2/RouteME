export type Greeting = {
  id: number;
  message: string;
};

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

export type DemoUser = {
  id: number;
  nickname: string;
  avatar_initial: string;
  school: string;
  bio: string;
  interests: string[];
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
  avatar_initial?: string;
  school: string;
  bio?: string;
  interests: string[];
};

export type ProfileStats = {
  published: number;
  completed: number;
  joined: number;
  shared: number;
};

/**
 * 公开资料：只包含白名单字段与四项统计，不包含账户凭据。
 */
export type UserProfile = DemoUser & {
  joined_at: string;
  stats: ProfileStats;
};

export type TripStatus = 'recruiting' | 'full' | 'completed';

export type TripSummary = {
  id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  stops: string[];
  tags: string[];
  capacity: number;
  joined_count: number;
  status: TripStatus;
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
  q?: string;
  destination?: string;
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
  q?: string;
  destination?: string;
  tags?: string[];
};