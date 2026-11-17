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
  meeting_areas: string[];
  meeting_time: string | null;
  tags: string[];
  capacity: number;
  joined_count: number;
  status: TripStatus;
  ending_soon: boolean;
  publisher: DemoUser;
  created_at: string;
  /** 来源 AI 行程快照 id；非 AI 发布的行程为 null（契约 0.12.0 加性字段）。 */
  ai_itinerary_id?: number | null;
};

export type TripDetail = TripSummary & {
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
  meeting_areas?: string[] | null;
  meeting_time?: string | null;
  note?: string | null;
  budget_min_cents?: number | null;
  budget_max_cents?: number | null;
  tags: string[];
  capacity: number;
  /** 关联的 AI 行程快照 id；后端校验归属，非本人快照 400。 */
  ai_itinerary_id?: number | null;
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

/* ---------- AI 智能规划（add-ai-itinerary，契约 0.12.0） ---------- */

export type AiDuration = 'half_day' | 'one_day' | 'two_day';
export type AiTravelMode = 'transit' | 'walking' | 'driving';
export type AiPace = 'relaxed' | 'moderate' | 'compact';

/** 出发地 / 目的地：坐标必须来自高德（搜索 / 定位 / 地图点击），AI 不得虚构。 */
export type AiPlace = {
  name: string;
  lng: number;
  lat: number;
};

/** AI 只产出名称 / 理由 / 时间 / 估算；坐标由前端另行经高德解析。 */
export type AiPlanStop = {
  name: string;
  reason: string;
  arrival: string;
  stay_minutes: number;
  indoor: boolean;
};

export type AiPlanDay = {
  day: number;
  stops: AiPlanStop[];
};

/** 预算四项均为 AI 估算（整数分）；合计不信任 AI 字段，展示前重算。 */
export type AiBudget = {
  transport_cents: number;
  tickets_cents: number;
  food_cents: number;
  other_cents: number;
  total_cents: number;
};

export type AiPlan = {
  title: string;
  days: AiPlanDay[];
  tips: string[];
  packing: string[];
  budget: AiBudget;
};

/** Open-Meteo daily 预报归一字段；mm / 风速 / UV 上游缺省时可为 null。 */
export type WeatherForecast = {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_probability_pct: number;
  precipitation_mm?: number | null;
  weather_code: number;
  weather_text: string;
  wind_speed_kmh?: number | null;
  uv_index?: number | null;
  source: string;
};

export type AiGenerateRequest = {
  origin: AiPlace;
  destination: AiPlace;
  date: string;
  duration: AiDuration;
  budget_cents: number | null;
  travel_mode: AiTravelMode;
  interests: string[];
  pace: AiPace;
  reduce_budget: boolean;
};

/** weather 为本次生成后端实际注入提示词的权威天气摘要（L-02）。 */
export type AiGenerateResponse = {
  plan: AiPlan;
  weather: WeatherForecast;
};

/** 快照景点：resolved=true 时 lng/lat 必须为数值；未解析不伪造坐标。 */
export type AiSnapshotStop = AiPlanStop & {
  order: number;
  resolved: boolean;
  lng?: number | null;
  lat?: number | null;
};

export type AiRouteLeg = {
  from_id: string;
  to_id: string;
  distance_meters: number;
  duration_seconds: number;
};

/** 高德真实路线结果；距离 / 时间只能来自高德，不得由 AI 产出。 */
export type AiSnapshotRoute = {
  mode: AiTravelMode;
  distance_meters: number;
  duration_seconds: number;
  legs: AiRouteLeg[];
};

/** 完整快照；route / weather / ai_budget 在对应服务失败时可为 null，不伪造数据。 */
export type AiItinerarySnapshot = {
  origin: AiPlace;
  destination: AiPlace;
  date: string;
  duration: AiDuration;
  travel_mode: AiTravelMode;
  interests: string[];
  pace: AiPace;
  budget_cents: number | null;
  stops: AiSnapshotStop[];
  route: AiSnapshotRoute | null;
  weather: WeatherForecast | null;
  tips: string[];
  packing: string[];
  ai_budget: AiBudget | null;
};

export type AiItinerarySaved = {
  id: number;
};

/** 地图数据模型统一从 types 取用，业务层不直接依赖 AmapService 路径。 */
export type { PlaceResult, RoutePlan, RouteWaypoint, TravelMode } from './map/amap/AmapService';