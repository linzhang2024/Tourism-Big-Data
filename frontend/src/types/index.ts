export type InterestPreference = 'culture' | 'nature' | 'food' | 'shopping' | 'adventure' | 'relaxation';

export interface TrendModel {
  city: string;
  keyword: string;
  score: number;
}

export interface PermissionResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface RoleResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  permissions: PermissionResponse[];
}

export interface RoleCreate {
  name: string;
  code: string;
  description?: string;
}

export interface Activity {
  time: string;
  name: string;
  description?: string;
  location?: string;
  estimated_cost?: number;
  category?: string;
}

export interface DayPlan {
  day: number;
  activities: Activity[];
  summary?: string;
}

export interface ItineraryRequest {
  departure: string;
  destination: string;
  days: number;
  budget?: number;
  interests?: InterestPreference[];
  travel_style?: string;
}

export interface ItineraryResponse {
  title: string;
  departure: string;
  destination: string;
  days: number;
  estimated_total_cost?: number;
  daily_plans: DayPlan[];
  tips?: string[];
}

export interface ItineraryCreate {
  title: string;
  departure: string;
  destination: string;
  days: number;
  budget?: number;
  estimated_total_cost?: number;
  daily_plans: DayPlan[];
  tips?: string[];
  interests?: InterestPreference[];
  travel_style?: string;
}

export interface ItineraryUpdate {
  title?: string;
  departure?: string;
  destination?: string;
  days?: number;
  budget?: number;
  estimated_total_cost?: number;
  daily_plans?: DayPlan[];
  tips?: string[];
  interests?: InterestPreference[];
  travel_style?: string;
}

export interface ItineraryDetail {
  id: number;
  user_id: number;
  title: string;
  departure: string;
  destination: string;
  days: number;
  budget?: number;
  estimated_total_cost?: number;
  daily_plans: DayPlan[];
  tips?: string[];
  interests?: string[];
  travel_style?: string;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role_code: string;
  created_at: string;
  updated_at?: string;
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

export interface StatsResponse {
  access_level: string;
  data_retrieved_at: string;
  stats: Record<string, any>;
  user_role: string;
  user_permissions: string[];
}

export type PermissionCode = 'data:view' | 'data:export' | 'spider:run' | 'sys:manage';
