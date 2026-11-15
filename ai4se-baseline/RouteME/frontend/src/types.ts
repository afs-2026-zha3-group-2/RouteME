export type Greeting = {
  id: number;
  message: string;
};

export type DemoUser = {
  id: number;
  nickname: string;
  avatar_initial: string;
  school: string;
  bio: string;
  interests: string[];
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
  destination: string;
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
  sort?: 'date' | 'new';
};